const pool = require('../config/db');

async function createUsageSnapshot(workloadId, cpuUsed, memoryUsed, timestamp) {
  const result = await pool.query(
    'INSERT INTO usage_snapshots (workload_id, actual_cpu_used, actual_memory_used, "timestamp") VALUES ($1, $2, $3, COALESCE($4, now())) RETURNING *',
    [workloadId, cpuUsed, memoryUsed, timestamp]
  );
  return result.rows[0];
}

async function getUsageSnapshotsByWorkload(workloadId) {
  const result = await pool.query(
    'SELECT * FROM usage_snapshots WHERE workload_id = $1 ORDER BY "timestamp"',
    [workloadId]
  );
  return result.rows;
}

module.exports = { createUsageSnapshot, getUsageSnapshotsByWorkload };
