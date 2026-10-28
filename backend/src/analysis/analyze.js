const pool = require('../config/db');

const LOOKBACK_DAYS = 7; // how much history to look at
const MIN_SAMPLES = 24; // need at least a day of hourly data before judging
const HEADROOM = 1.3; // keep 30% above the busiest usage
const MIN_REDUCTION = 0.3; // only suggest a change if it cuts a request by 30% or more
const IDLE_CPU_RATIO = 0.05; // busiest CPU below 5% of the request...
const IDLE_MEM_RATIO = 0.1; // ...and peak memory below 10% of the request means idle

function round(value, places) {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

// Busy-time and peak usage per workload over the lookback window
async function getUsageStats() {
  const result = await pool.query(
    `SELECT w.id, w.name, w.requested_cpu, w.requested_memory,
            COUNT(u.id) AS samples,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY u.actual_cpu_used) AS p95_cpu,
            MAX(u.actual_memory_used) AS max_mem
     FROM workloads w
     JOIN usage_snapshots u ON u.workload_id = w.id
     WHERE u."timestamp" > now() - make_interval(days => $1)
     GROUP BY w.id`,
    [LOOKBACK_DAYS]
  );
  return result.rows;
}

// Each cost snapshot is the cost of its own hour, so the sum over the window
// scaled up to 30 days gives the monthly cost
async function getMonthlyCosts() {
  const result = await pool.query(
    `SELECT workload_id, SUM(cpu_cost) AS cpu_cost, SUM(memory_cost) AS memory_cost
     FROM cost_snapshots
     WHERE "timestamp" > now() - make_interval(days => $1)
     GROUP BY workload_id`,
    [LOOKBACK_DAYS]
  );

  const costs = {};
  for (const row of result.rows) {
    costs[row.workload_id] = {
      cpu: (Number(row.cpu_cost) * 30) / LOOKBACK_DAYS,
      memory: (Number(row.memory_cost) * 30) / LOOKBACK_DAYS,
    };
  }
  return costs;
}

// If an open recommendation of this type already exists, refresh it instead of adding a duplicate
async function saveRecommendation(workloadId, type, savings, details) {
  const existing = await pool.query(
    "SELECT id FROM recommendations WHERE workload_id = $1 AND type = $2 AND status = 'open'",
    [workloadId, type]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE recommendations SET estimated_monthly_savings = $1, details = $2 WHERE id = $3',
      [savings, details, existing.rows[0].id]
    );
    return 'updated';
  }

  await pool.query(
    'INSERT INTO recommendations (workload_id, type, estimated_monthly_savings, details) VALUES ($1, $2, $3, $4)',
    [workloadId, type, savings, details]
  );
  return 'created';
}

// Suggest a smaller request only if it cuts the current one by enough to matter
function suggest(requested, needed) {
  const suggested = Math.min(requested, needed * HEADROOM);
  const reduction = 1 - suggested / requested;
  if (reduction >= MIN_REDUCTION) {
    return { value: suggested, reduction };
  }
  return { value: requested, reduction: 0 };
}

async function runAnalysis() {
  const stats = await getUsageStats();
  const costs = await getMonthlyCosts();
  const summary = { analyzed: stats.length, created: 0, updated: 0, skipped: 0 };

  for (const w of stats) {
    const cost = costs[w.id];
    const requestedCpu = Number(w.requested_cpu);
    const requestedMem = Number(w.requested_memory);

    // Not enough history, no cost data, or nothing requested to compare against
    if (Number(w.samples) < MIN_SAMPLES || !cost || !requestedCpu || !requestedMem) {
      summary.skipped++;
      continue;
    }

    const p95Cpu = Number(w.p95_cpu);
    const maxMem = Number(w.max_mem);

    // Idle: it barely uses anything it asked for, so all of its cost is waste
    if (p95Cpu < requestedCpu * IDLE_CPU_RATIO && maxMem < requestedMem * IDLE_MEM_RATIO) {
      const result = await saveRecommendation(w.id, 'idle', round(cost.cpu + cost.memory, 2), {
        workload: w.name,
        lookback_days: LOOKBACK_DAYS,
        requested_cpu: requestedCpu,
        p95_cpu_used: round(p95Cpu, 3),
        requested_memory_mb: requestedMem,
        peak_memory_used_mb: round(maxMem, 1),
      });
      summary[result]++;
      continue;
    }

    // Rightsizing: CPU is sized from busy-time usage (extra demand only slows it down),
    // memory from the peak (going over it gets the pod killed)
    const cpu = suggest(requestedCpu, p95Cpu);
    const mem = suggest(requestedMem, maxMem);

    if (cpu.reduction === 0 && mem.reduction === 0) {
      continue; // already sized well
    }

    const savings = cost.cpu * cpu.reduction + cost.memory * mem.reduction;
    const result = await saveRecommendation(w.id, 'rightsizing', round(savings, 2), {
      workload: w.name,
      lookback_days: LOOKBACK_DAYS,
      current_cpu: requestedCpu,
      suggested_cpu: round(cpu.value, 3),
      current_memory_mb: requestedMem,
      suggested_memory_mb: Math.round(mem.value),
    });
    summary[result]++;
  }

  return summary;
}

module.exports = { runAnalysis, LOOKBACK_DAYS };
