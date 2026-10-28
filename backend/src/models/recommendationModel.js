const pool = require('../config/db');

// Recommendations together with the names of their workload, namespace and cluster
const SELECT_WITH_NAMES = `
  SELECT r.*, w.name AS workload_name, n.name AS namespace, c.name AS cluster
  FROM recommendations r
  JOIN workloads w ON w.id = r.workload_id
  JOIN namespaces n ON n.id = w.namespace_id
  JOIN clusters c ON c.id = n.cluster_id`;

async function createRecommendation(workloadId, type, estimatedMonthlySavings, details) {
  const result = await pool.query(
    'INSERT INTO recommendations (workload_id, type, estimated_monthly_savings, details) VALUES ($1, $2, $3, $4) RETURNING *',
    [workloadId, type, estimatedMonthlySavings, details]
  );
  return result.rows[0];
}

async function getRecommendations(status) {
  const order = ' ORDER BY r.estimated_monthly_savings DESC NULLS LAST, r.detected_at DESC';

  if (status) {
    const result = await pool.query(SELECT_WITH_NAMES + ' WHERE r.status = $1' + order, [status]);
    return result.rows;
  }
  const result = await pool.query(SELECT_WITH_NAMES + order);
  return result.rows;
}

async function updateRecommendationStatus(id, status) {
  const result = await pool.query(
    'UPDATE recommendations SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

module.exports = { createRecommendation, getRecommendations, updateRecommendationStatus };
