const pool = require('../config/db');

async function createCostSnapshot(workloadId, cpuCost, memoryCost, totalCost, timestamp) {
  const result = await pool.query(
    'INSERT INTO cost_snapshots (workload_id, cpu_cost, memory_cost, total_cost, "timestamp") VALUES ($1, $2, $3, $4, COALESCE($5, now())) RETURNING *',
    [workloadId, cpuCost, memoryCost, totalCost, timestamp]
  );
  return result.rows[0];
}

async function getCostSnapshotsByWorkload(workloadId) {
  const result = await pool.query(
    'SELECT * FROM cost_snapshots WHERE workload_id = $1 ORDER BY "timestamp"',
    [workloadId]
  );
  return result.rows;
}

module.exports = { createCostSnapshot, getCostSnapshotsByWorkload };
