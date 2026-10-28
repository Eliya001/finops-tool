const pool = require('../config/db');
const { LOOKBACK_DAYS } = require('../analysis/analyze');

// Cost snapshots are hourly, so the sum over the window scaled to 30 days is the monthly cost
async function getMonthlyCostByNamespace() {
  const result = await pool.query(
    `SELECT c.name AS cluster, n.name AS namespace,
            SUM(cs.total_cost) * 30 / $1::int AS monthly_cost
     FROM cost_snapshots cs
     JOIN workloads w ON w.id = cs.workload_id
     JOIN namespaces n ON n.id = w.namespace_id
     JOIN clusters c ON c.id = n.cluster_id
     WHERE cs."timestamp" > now() - make_interval(days => $1::int)
     GROUP BY c.name, n.name
     ORDER BY monthly_cost DESC`,
    [LOOKBACK_DAYS]
  );
  return result.rows;
}

async function getRecommendationTotals() {
  const result = await pool.query(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(estimated_monthly_savings), 0) AS savings
     FROM recommendations
     GROUP BY status`
  );
  return result.rows;
}

module.exports = { getMonthlyCostByNamespace, getRecommendationTotals };
