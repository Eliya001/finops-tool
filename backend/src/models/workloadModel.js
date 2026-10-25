const pool = require('../config/db');

async function createWorkload(namespaceId, name, kind, requestedCpu, requestedMemory) {
  const result = await pool.query(
    'INSERT INTO workloads (namespace_id, name, kind, requested_cpu, requested_memory) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [namespaceId, name, kind, requestedCpu, requestedMemory]
  );
  return result.rows[0];
}

async function getWorkloadsByNamespace(namespaceId) {
  const result = await pool.query(
    'SELECT * FROM workloads WHERE namespace_id = $1 ORDER BY id',
    [namespaceId]
  );
  return result.rows;
}

module.exports = { createWorkload, getWorkloadsByNamespace };
