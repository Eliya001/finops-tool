const pool = require('../config/db');

const LOOKBACK_DAYS = 7;
const MIN_SAMPLES = 24;
const HEADROOM = 1.3;
const MIN_REDUCTION = 0.3;
const IDLE_CPU_RATIO = 0.05;
const IDLE_MEM_RATIO = 0.1;

function round(value, places) {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}


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


function suggest(requested, needed) {
  const suggested = Math.min(requested, needed * HEADROOM);
  const reduction = 1 - suggested / requested;
  if (reduction >= MIN_REDUCTION) {
    return { value: suggested, reduction };
  }
  return { value: requested, reduction: 0 };
}


function evaluateWorkload(w, cost) {
  const requestedCpu = Number(w.requested_cpu);
  const requestedMem = Number(w.requested_memory);


  if (Number(w.samples) < MIN_SAMPLES || !cost || !requestedCpu || !requestedMem) {
    return { skipped: true };
  }

  const p95Cpu = Number(w.p95_cpu);
  const maxMem = Number(w.max_mem);


  if (p95Cpu < requestedCpu * IDLE_CPU_RATIO && maxMem < requestedMem * IDLE_MEM_RATIO) {
    return {
      type: 'idle',
      savings: round(cost.cpu + cost.memory, 2),
      details: {
        workload: w.name,
        lookback_days: LOOKBACK_DAYS,
        requested_cpu: requestedCpu,
        p95_cpu_used: round(p95Cpu, 3),
        requested_memory_mb: requestedMem,
        peak_memory_used_mb: round(maxMem, 1),
      },
    };
  }


  const cpu = suggest(requestedCpu, p95Cpu);
  const mem = suggest(requestedMem, maxMem);

  if (cpu.reduction === 0 && mem.reduction === 0) {
    return null;
  }

  const savings = cost.cpu * cpu.reduction + cost.memory * mem.reduction;
  return {
    type: 'rightsizing',
    savings: round(savings, 2),
    details: {
      workload: w.name,
      lookback_days: LOOKBACK_DAYS,
      current_cpu: requestedCpu,
      suggested_cpu: round(cpu.value, 3),
      current_memory_mb: requestedMem,
      suggested_memory_mb: Math.round(mem.value),
    },
  };
}

async function runAnalysis() {
  const stats = await getUsageStats();
  const costs = await getMonthlyCosts();
  const summary = { analyzed: stats.length, created: 0, updated: 0, skipped: 0 };

  for (const w of stats) {
    const result = evaluateWorkload(w, costs[w.id]);

    if (result === null) {
      continue;
    }
    if (result.skipped) {
      summary.skipped++;
      continue;
    }

    const outcome = await saveRecommendation(w.id, result.type, result.savings, result.details);
    summary[outcome]++;
  }

  return summary;
}

module.exports = { runAnalysis, evaluateWorkload, suggest, LOOKBACK_DAYS };
