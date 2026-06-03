const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

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
        LIMIT 250
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
    ]);

    const row = summary.rows[0] || {};
    const funding = fundingBreakdown.rows[0] || {};

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
      projects: projects.rows.map((p) => ({
        ...p,
        total_cost: toNumber(p.total_cost),
        funding_gap: toNumber(p.funding_gap),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

router.get('/', overview);
router.get('/overview', overview);

module.exports = router;
