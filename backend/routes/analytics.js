const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [
      summary, bySector, byStatus, byDistrict, trlDistribution,
      topInvestors, impactMetrics, investmentAnalytics
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_projects,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COALESCE(SUM(total_cost),0) AS total_investment,
          COALESCE(SUM(funding_gap),0) AS funding_gap,
          COALESCE(SUM(direct_beneficiaries),0) AS total_beneficiaries,
          COALESCE(SUM(jobs_created),0) AS total_jobs,
          COUNT(DISTINCT user_id) AS project_owners
        FROM projects WHERE status != 'draft'
      `),
      pool.query(`
        SELECT primary_sector AS sector, COUNT(*) AS count,
               COALESCE(SUM(total_cost),0) AS total_cost
        FROM projects WHERE primary_sector IS NOT NULL AND status != 'draft'
        GROUP BY primary_sector ORDER BY count DESC
      `),
      pool.query(`
        SELECT status, COUNT(*) AS count FROM projects WHERE status != 'draft'
        GROUP BY status ORDER BY count DESC
      `),
      pool.query(`
        SELECT district, COUNT(*) AS count,
               COALESCE(SUM(total_cost),0) AS total_cost
        FROM projects WHERE district IS NOT NULL AND status != 'draft'
        GROUP BY district ORDER BY count DESC LIMIT 10
      `),
      pool.query(`
        SELECT trl_level, COUNT(*) AS count
        FROM projects WHERE trl_level IS NOT NULL AND status != 'draft'
        GROUP BY trl_level ORDER BY trl_level
      `),
      pool.query(`
        SELECT u.first_name || ' ' || u.last_name AS name, u.organization,
               COUNT(i.id) AS interest_count,
               COALESCE(SUM(i.investment_range_max),0) AS total_potential
        FROM interests i JOIN users u ON i.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.organization
        ORDER BY interest_count DESC LIMIT 10
      `),
      pool.query(`
        SELECT COALESCE(SUM(direct_beneficiaries),0) AS direct,
               COALESCE(SUM(indirect_beneficiaries),0) AS indirect,
               COALESCE(SUM(jobs_created),0) AS jobs
        FROM projects WHERE status = 'approved'
      `),
      pool.query(`
        SELECT COALESCE(SUM(total_cost),0) AS total,
               COALESCE(SUM(COALESCE(total_cost,0) - COALESCE(funding_gap,0)),0) AS committed,
               COALESCE(SUM(funding_gap),0) AS gap
        FROM projects WHERE status != 'draft'
      `)
    ]);

    res.json({
      summary: summary.rows[0],
      by_sector: bySector.rows,
      by_status: byStatus.rows,
      by_district: byDistrict.rows,
      trl_distribution: trlDistribution.rows,
      top_investors: topInvestors.rows,
      impact_metrics: impactMetrics.rows[0],
      investment_analytics: investmentAnalytics.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
