const pool = require('../config/db');

async function createCluster(name, provider, region) {
  const result = await pool.query(
    'INSERT INTO clusters (name, provider, region) VALUES ($1, $2, $3) RETURNING *',
    [name, provider, region]
  );
  return result.rows[0];
}

async function getAllClusters() {
  const result = await pool.query('SELECT * FROM clusters ORDER BY id');
  return result.rows;
}

module.exports = { createCluster, getAllClusters };
