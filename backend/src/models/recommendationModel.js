const pool = require('../config/db');

async function createRecommendation(workloadId, type, estimatedMonthlySavings, details) {
  const result = await pool.query(
    'INSERT INTO recommendations (workload_id, type, estimated_monthly_savings, details) VALUES ($1, $2, $3, $4) RETURNING *',
    [workloadId, type, estimatedMonthlySavings, details]
  );
  return result.rows[0];
}

async function getRecommendations(status) {
  if (status) {
    const result = await pool.query(
      'SELECT * FROM recommendations WHERE status = $1 ORDER BY detected_at DESC',
      [status]
    );
    return result.rows;
  }
  const result = await pool.query('SELECT * FROM recommendations ORDER BY detected_at DESC');
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
