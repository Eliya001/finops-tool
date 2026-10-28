const pool = require('../config/db');

const HOURS = 7 * 24; // one week of hourly data
const CPU_PRICE = 0.033; // $ per CPU core per hour
const MEM_PRICE = 0.0045; // $ per GB per hour

const workloads = [
  { namespace: 'shop', name: 'web-frontend', cpu: 2, mem: 2048, usedCpu: 0.3, usedMem: 600 },
  { namespace: 'shop', name: 'orders-api', cpu: 1, mem: 1024, usedCpu: 0.65, usedMem: 700 },
  { namespace: 'batch', name: 'old-report-job', cpu: 1, mem: 512, usedCpu: 0.01, usedMem: 40 },
];

async function seed() {
  // Remove the demo cluster if it exists, so the script can be run again
  await pool.query("DELETE FROM clusters WHERE name = 'demo-cluster'");

  const cluster = await pool.query(
    "INSERT INTO clusters (name, provider, region) VALUES ('demo-cluster', 'demo', 'nowhere') RETURNING id"
  );
  const clusterId = cluster.rows[0].id;
  const namespaceIds = {};

  for (const w of workloads) {
    if (!namespaceIds[w.namespace]) {
      const ns = await pool.query(
        'INSERT INTO namespaces (cluster_id, name) VALUES ($1, $2) RETURNING id',
        [clusterId, w.namespace]
      );
      namespaceIds[w.namespace] = ns.rows[0].id;
    }

    const wl = await pool.query(
      'INSERT INTO workloads (namespace_id, name, kind, requested_cpu, requested_memory) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [namespaceIds[w.namespace], w.name, 'Deployment', w.cpu, w.mem]
    );
    const workloadId = wl.rows[0].id;

    const times = [];
    const cpuUsed = [];
    const memUsed = [];
    const cpuCost = [];
    const memCost = [];

    for (let i = 0; i < HOURS; i++) {
      const t = new Date(Date.now() - (HOURS - i) * 3600 * 1000);
      const wave = Math.sin((t.getUTCHours() / 24) * 2 * Math.PI);
      const wobble = Math.sin(i * 7.3);

      times.push(t.toISOString());
      cpuUsed.push(Math.max(0, w.usedCpu * (1 + 0.25 * wave + 0.1 * wobble)).toFixed(4));
      memUsed.push((w.usedMem * (1 + 0.05 * wave)).toFixed(1));
      cpuCost.push((w.cpu * CPU_PRICE).toFixed(6));
      memCost.push(((w.mem / 1024) * MEM_PRICE).toFixed(6));
    }

    await pool.query(
      'INSERT INTO usage_snapshots (workload_id, "timestamp", actual_cpu_used, actual_memory_used) SELECT $1::int, t, c, m FROM unnest($2::timestamptz[], $3::numeric[], $4::numeric[]) AS x(t, c, m)',
      [workloadId, times, cpuUsed, memUsed]
    );
    await pool.query(
      'INSERT INTO cost_snapshots (workload_id, "timestamp", cpu_cost, memory_cost, total_cost) SELECT $1::int, t, c, m, c + m FROM unnest($2::timestamptz[], $3::numeric[], $4::numeric[]) AS x(t, c, m)',
      [workloadId, times, cpuCost, memCost]
    );

    console.log('Seeded ' + w.namespace + '/' + w.name + ' with ' + HOURS + ' hourly snapshots');
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
