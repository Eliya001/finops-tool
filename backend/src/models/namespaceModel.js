const pool = require('../config/db');

async function createNamespace(clusterId, name) {
  const result = await pool.query(
    'INSERT INTO namespaces (cluster_id, name) VALUES ($1, $2) RETURNING *',
    [clusterId, name]
  );
  return result.rows[0];
}

async function getNamespacesByCluster(clusterId) {
  const result = await pool.query(
    'SELECT * FROM namespaces WHERE cluster_id = $1 ORDER BY id',
    [clusterId]
  );
  return result.rows;
}

module.exports = { createNamespace, getNamespacesByCluster };
