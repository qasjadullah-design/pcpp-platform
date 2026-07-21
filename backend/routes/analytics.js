const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

router.get('/public', async (req, res) => {
  try {
    const portfolio = req.query.portfolio === 'all' ? 'all' : 'wef';
    const scope = portfolio === 'wef' ? "AND p.priority_level = 'WEF'" : '';
    const [headline, funding, sources, sectors, provinces, stages, carbon] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total_projects, COUNT(*) FILTER (WHERE priority_level='WEF') AS wef_projects,
        COALESCE(SUM(total_cost),0) AS total_finance_required, COALESCE(SUM(funding_gap),0) AS investment_gap,
        COUNT(DISTINCT province) AS provinces_covered, COALESCE(SUM(estimated_co2_reduction),0) AS total_tco2e_yr
        FROM projects p WHERE p.status NOT IN ('draft','rejected','archived') ${scope}`),
      pool.query(`SELECT COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM project_funding_sources f WHERE f.project_id=p.id)
        THEN (SELECT COALESCE(SUM(f.amount),0) FROM project_funding_sources f WHERE f.project_id=p.id AND f.status IN ('secured','committed'))
        ELSE COALESCE(p.equity_fund,0)+COALESCE(p.debt_loan,0)+COALESCE(p.grant_amount,0) END),0) AS financing_secured
        FROM projects p WHERE p.status NOT IN ('draft','rejected','archived') ${scope}`),
      pool.query(`SELECT t.code, t.label, COALESCE(SUM(f.amount) FILTER (WHERE p.id IS NOT NULL AND f.status IN ('secured','committed')),0) AS secured,
        COALESCE(SUM(f.amount) FILTER (WHERE p.id IS NOT NULL),0) AS pipeline, COUNT(DISTINCT p.id) AS projects
        FROM funding_source_types t LEFT JOIN project_funding_sources f ON f.source_type=t.code
        LEFT JOIN projects p ON p.id=f.project_id AND p.status NOT IN ('draft','rejected','archived') ${portfolio === 'wef' ? "AND p.priority_level='WEF'" : ''}
        GROUP BY t.code,t.label,t.sort_order ORDER BY t.sort_order`),
      pool.query(`SELECT COALESCE(primary_sector,'Unspecified') AS sector, COUNT(*) AS projects, COALESCE(SUM(total_cost),0) AS value,
        COALESCE(SUM(funding_gap),0) AS gap FROM projects p WHERE p.status NOT IN ('draft','rejected','archived') ${scope} GROUP BY primary_sector ORDER BY value DESC`),
      pool.query(`SELECT COALESCE(province,'Unspecified') AS province, COUNT(*) AS projects, COALESCE(SUM(total_cost),0) AS value
        FROM projects p WHERE p.status NOT IN ('draft','rejected','archived') ${scope} GROUP BY province ORDER BY projects DESC`),
      pool.query(`SELECT COALESCE(stage,'unspecified') AS stage, COUNT(*) AS projects FROM projects p
        WHERE p.status NOT IN ('draft','rejected','archived') ${scope} GROUP BY stage ORDER BY projects DESC`),
      pool.query(`SELECT COALESCE(carbon_credit_methodology,'not_decided') AS methodology, COUNT(*) AS projects,
        COUNT(*) FILTER (WHERE carbon_finance_option) AS carbon_finance_projects,
        COALESCE(SUM(climate_finance_amount),0) AS climate_finance FROM projects p
        WHERE p.status NOT IN ('draft','rejected','archived') ${scope} GROUP BY carbon_credit_methodology ORDER BY projects DESC`),
    ]);
    const h = headline.rows[0] || {}; const f = funding.rows[0] || {};
    res.json({ portfolio, headline: {
      total_projects: toInt(h.total_projects), wef_projects: toInt(h.wef_projects), total_finance_required: toNumber(h.total_finance_required),
      financing_secured: toNumber(f.financing_secured), investment_gap: toNumber(h.investment_gap), provinces_covered: toInt(h.provinces_covered), total_tco2e_yr: toNumber(h.total_tco2e_yr),
    }, funding_sources: sources.rows, sectors: sectors.rows, provinces: provinces.rows, stages: stages.rows, carbon: carbon.rows });
  } catch (error) { console.error('Public analytics failed:', error); res.status(500).json({ error: 'Failed to fetch public analytics' }); }
});

router.use(authenticate);

const allowedRoles = new Set(['admin', 'superadmin', 'provincial']);

const buildScope = (req, alias = 'p') => {
  if (!allowedRoles.has(req.user.role)) return null;

  const params = [];
  const conditions = [`${alias}.status != 'draft'`];

  if (req.user.role === 'provincial') {
    if (!req.user.province) return null;
    params.push(req.user.province);
    conditions.push(`${alias}.province = $${params.length}`);
  }

  return {
    params,
    where: `WHERE ${conditions.join(' AND ')}`,
    scope: req.user.role === 'provincial' ? 'province' : 'national',
  };
};

const toInt = (value) => parseInt(value || 0, 10);
const toNumber = (value) => Number(value || 0);

async function overview(req, res) {
  const scoped = buildScope(req);
  if (!scoped) return res.status(403).json({ error: 'Analytics access requires admin or provincial role' });

  const { where, params, scope } = scoped;

  try {
    const [
      summary,
      bySector,
      byLifecycle,
      byTrl,
      byDistrict,
      fundingBreakdown,
      projects,
      byProvince,
      provinceRank,
      mapDistricts,
      mapProjects,
      missingMapProjects,
      mitigationSummary,
      mitigationByBasis,
      partialSupport,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_projects,
          COALESCE(SUM(total_cost), 0) AS total_investment,
          COALESCE(SUM(funding_gap), 0) AS funding_gap,
          COUNT(*) FILTER (WHERE status = 'under_implementation') AS ongoing,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status NOT IN ('under_implementation', 'completed')) AS pipeline
        FROM projects p
        ${where}
      `, params),
      pool.query(`
        SELECT
          CASE
            WHEN primary_sector ILIKE '%water%' THEN 'Water'
            WHEN primary_sector ILIKE '%energy%' OR primary_sector ILIKE '%power%' THEN 'Energy'
            WHEN primary_sector ILIKE '%food%' OR primary_sector ILIKE '%agri%' THEN 'Food'
            ELSE 'Other'
          END AS sector,
          COUNT(*) AS count,
          COALESCE(SUM(total_cost), 0) AS investment
        FROM projects p
        ${where}
          AND primary_sector IS NOT NULL
        GROUP BY sector
        ORDER BY count DESC
      `, params),
      pool.query(`
        SELECT
          CASE
            WHEN status = 'under_implementation' THEN 'Ongoing'
            WHEN status = 'completed' THEN 'Completed'
            ELSE 'Pipeline'
          END AS lifecycle,
          COUNT(*) AS count
        FROM projects p
        ${where}
        GROUP BY lifecycle
      `, params),
      pool.query(`
        SELECT trl_level, COUNT(*) AS count
        FROM projects p
        ${where}
          AND trl_level IS NOT NULL
        GROUP BY trl_level
        ORDER BY trl_level
      `, params),
      pool.query(`
        SELECT district, COUNT(*) AS count, COALESCE(SUM(total_cost), 0) AS investment
        FROM projects p
        ${where}
          AND district IS NOT NULL
        GROUP BY district
        ORDER BY count DESC
        LIMIT 10
      `, params),
      pool.query(`
        SELECT
          COALESCE(SUM(total_cost), 0) AS total,
          COALESCE(SUM(funding_gap), 0) AS gap,
          COALESCE(SUM(COALESCE(total_cost, 0) - COALESCE(funding_gap, 0)), 0) AS secured
        FROM projects p
        ${where}
      `, params),
      pool.query(`
        SELECT id, title, province, district, primary_sector, status, trl_level,
               COALESCE(total_cost, 0) AS total_cost,
               COALESCE(funding_gap, 0) AS funding_gap
        FROM projects p
        ${where}
        ORDER BY COALESCE(total_cost, 0) DESC, title ASC
      `, params),
      scope === 'national'
        ? pool.query(`
          SELECT COALESCE(province, 'Unspecified') AS province,
                 COUNT(*) AS count,
                 COALESCE(SUM(total_cost), 0) AS investment
          FROM projects p
          ${where}
          GROUP BY COALESCE(province, 'Unspecified')
          ORDER BY count DESC
        `, params)
        : Promise.resolve({ rows: [] }),
      scope === 'province'
        ? pool.query(`
          WITH ranked AS (
            SELECT province, COUNT(*) AS count,
                   RANK() OVER (ORDER BY COUNT(*) DESC) AS rank
            FROM projects
            WHERE status != 'draft' AND province IS NOT NULL
            GROUP BY province
          )
          SELECT province, count, rank
          FROM ranked
          WHERE province = $1
        `, [req.user.province])
        : Promise.resolve({ rows: [] }),
      pool.query(`
        SELECT
          COALESCE(province, 'Unspecified') AS province,
          COALESCE(district, 'Unspecified') AS district,
          COUNT(*) AS count,
          COALESCE(SUM(total_cost), 0) AS investment,
          COUNT(*) FILTER (
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND latitude BETWEEN 23 AND 38
              AND longitude BETWEEN 60 AND 78
          ) AS geocoded_count,
          AVG(latitude) FILTER (
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND latitude BETWEEN 23 AND 38
              AND longitude BETWEEN 60 AND 78
          ) AS latitude,
          AVG(longitude) FILTER (
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND latitude BETWEEN 23 AND 38
              AND longitude BETWEEN 60 AND 78
          ) AS longitude
        FROM projects p
        ${where}
        GROUP BY COALESCE(province, 'Unspecified'), COALESCE(district, 'Unspecified')
        ORDER BY count DESC, district ASC
      `, params),
      pool.query(`
        SELECT id, title, province, district, primary_sector, status, trl_level,
               latitude, longitude,
               COALESCE(total_cost, 0) AS total_cost,
               COALESCE(funding_gap, 0) AS funding_gap
        FROM projects p
        ${where}
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND latitude BETWEEN 23 AND 38
          AND longitude BETWEEN 60 AND 78
        ORDER BY COALESCE(total_cost, 0) DESC, title ASC
      `, params),
      pool.query(`
        SELECT id, title, province, district, city, primary_sector, status, trl_level,
               latitude, longitude,
               COALESCE(total_cost, 0) AS total_cost,
               COALESCE(funding_gap, 0) AS funding_gap
        FROM projects p
        ${where}
          AND (
            latitude IS NULL
            OR longitude IS NULL
            OR latitude NOT BETWEEN 23 AND 38
            OR longitude NOT BETWEEN 60 AND 78
          )
        ORDER BY COALESCE(province, 'Unspecified') ASC,
                 COALESCE(district, 'Unspecified') ASC,
                 title ASC
      `, params),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE mitigation_tco2e IS NOT NULL AND mitigation_tco2e > 0) AS projects_with_mitigation,
          COALESCE(SUM(mitigation_tco2e), 0) AS total_tco2e,
          COALESCE(SUM(mitigation_tco2e) FILTER (WHERE mitigation_basis = 'annual'), 0) AS annual_tco2e,
          COALESCE(SUM(mitigation_tco2e) FILTER (WHERE mitigation_basis = 'lifetime'), 0) AS lifetime_tco2e
        FROM projects p
        ${where}
      `, params),
      pool.query(`
        SELECT COALESCE(mitigation_basis, 'unspecified') AS basis,
               COUNT(*) AS count,
               COALESCE(SUM(mitigation_tco2e), 0) AS tco2e
        FROM projects p
        ${where}
          AND mitigation_tco2e IS NOT NULL
          AND mitigation_tco2e > 0
        GROUP BY COALESCE(mitigation_basis, 'unspecified')
        ORDER BY tco2e DESC
      `, params),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(funding_gap, 0) > 0 AND COALESCE(total_cost, 0) > 0) AS count,
          COALESCE(SUM(funding_gap) FILTER (WHERE COALESCE(funding_gap, 0) > 0 AND COALESCE(total_cost, 0) > 0), 0) AS funding_gap,
          COALESCE(SUM(total_cost) FILTER (WHERE COALESCE(funding_gap, 0) > 0 AND COALESCE(total_cost, 0) > 0), 0) AS total_cost
        FROM projects p
        ${where}
      `, params),
    ]);

    const row = summary.rows[0] || {};
    const funding = fundingBreakdown.rows[0] || {};
    const mitigation = mitigationSummary.rows[0] || {};
    const partial = partialSupport.rows[0] || {};

    res.json({
      scope,
      province: scope === 'province' ? req.user.province : null,
      summary: {
        total_projects: toInt(row.total_projects),
        total_investment: toNumber(row.total_investment),
        funding_gap: toNumber(row.funding_gap),
        ongoing: toInt(row.ongoing),
        pipeline: toInt(row.pipeline),
        completed: toInt(row.completed),
      },
      by_sector: bySector.rows.map((r) => ({
        sector: r.sector,
        count: toInt(r.count),
        investment: toNumber(r.investment),
      })),
      by_lifecycle: byLifecycle.rows.map((r) => ({
        lifecycle: r.lifecycle,
        count: toInt(r.count),
      })),
      by_trl: byTrl.rows.map((r) => ({
        trl_level: toInt(r.trl_level),
        count: toInt(r.count),
      })),
      by_district: byDistrict.rows.map((r) => ({
        district: r.district,
        count: toInt(r.count),
        investment: toNumber(r.investment),
      })),
      by_province: byProvince.rows.map((r) => ({
        province: r.province,
        count: toInt(r.count),
        investment: toNumber(r.investment),
      })),
      province_rank: provinceRank.rows[0]
        ? {
          province: provinceRank.rows[0].province,
          count: toInt(provinceRank.rows[0].count),
          rank: toInt(provinceRank.rows[0].rank),
        }
        : null,
      funding_breakdown: {
        total: toNumber(funding.total),
        secured: toNumber(funding.secured),
        gap: toNumber(funding.gap),
      },
      mitigation: {
        data_status: 'Reported project mitigation across the visible portfolio',
        projects_with_mitigation: toInt(mitigation.projects_with_mitigation),
        total_tco2e: toNumber(mitigation.total_tco2e),
        annual_tco2e: toNumber(mitigation.annual_tco2e),
        lifetime_tco2e: toNumber(mitigation.lifetime_tco2e),
        by_basis: mitigationByBasis.rows.map((r) => ({
          basis: r.basis,
          count: toInt(r.count),
          tco2e: toNumber(r.tco2e),
        })),
      },
      partial_support: {
        count: toInt(partial.count),
        funding_gap: toNumber(partial.funding_gap),
        total_cost: toNumber(partial.total_cost),
      },
      projects: projects.rows.map((p) => ({
        ...p,
        total_cost: toNumber(p.total_cost),
        funding_gap: toNumber(p.funding_gap),
      })),
      map: {
        bounds: {
          min_latitude: 23,
          max_latitude: 38,
          min_longitude: 60,
          max_longitude: 78,
        },
        districts: mapDistricts.rows.map((d) => ({
          province: d.province,
          district: d.district,
          count: toInt(d.count),
          investment: toNumber(d.investment),
          geocoded_count: toInt(d.geocoded_count),
          latitude: d.latitude === null ? null : toNumber(d.latitude),
          longitude: d.longitude === null ? null : toNumber(d.longitude),
        })),
        projects: mapProjects.rows.map((p) => ({
          ...p,
          latitude: toNumber(p.latitude),
          longitude: toNumber(p.longitude),
          total_cost: toNumber(p.total_cost),
          funding_gap: toNumber(p.funding_gap),
        })),
        missing_projects: missingMapProjects.rows.map((p) => ({
          ...p,
          latitude: p.latitude === null ? null : toNumber(p.latitude),
          longitude: p.longitude === null ? null : toNumber(p.longitude),
          total_cost: toNumber(p.total_cost),
          funding_gap: toNumber(p.funding_gap),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

router.get('/', overview);
router.get('/overview', overview);

module.exports = router;
