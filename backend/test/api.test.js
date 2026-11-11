const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const pool = require('../src/config/db');

// These tests start the real server and talk to a real database.
// They only run when RUN_INTEGRATION=true (the CI pipeline sets it).
const enabled = process.env.RUN_INTEGRATION === 'true';
const PORT = 4100;
const BASE = 'http://localhost:' + PORT;
const CLUSTER = 'ci-cluster';
const HOURS = 48;

let server;
let workloads = {};

async function call(method, path, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(BASE + '/health');
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('The server did not start');
}

// One workload with a steady usage, plus hourly usage and cost snapshots for it
async function createWorkload(namespaceId, name, cpu, mem, usedCpu, usedMem) {
  const created = await call('POST', '/namespaces/' + namespaceId + '/workloads', {
    name,
    kind: 'Deployment',
    requested_cpu: cpu,
    requested_memory: mem,
  });
  assert.equal(created.status, 201);
  const id = created.body.id;

  const requests = [];
  for (let i = 1; i <= HOURS; i++) {
    const timestamp = new Date(Date.now() - i * 3600 * 1000).toISOString();
    requests.push(
      call('POST', '/workloads/' + id + '/usage-snapshots', {
        actual_cpu_used: usedCpu,
        actual_memory_used: usedMem,
        timestamp,
      }),
      call('POST', '/workloads/' + id + '/cost-snapshots', {
        cpu_cost: cpu * 0.033,
        memory_cost: (mem / 1024) * 0.0045,
        timestamp,
      })
    );
  }
  const results = await Promise.all(requests);
  assert.ok(results.every((r) => r.status === 201));
  return id;
}

async function removeTestData() {
  await pool.query('DELETE FROM clusters WHERE name = $1', [CLUSTER]);
}

describe('API end to end', { skip: !enabled }, () => {
  before(async () => {
    await removeTestData();
    server = spawn(process.execPath, ['src/server.js'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore',
    });
    await waitForServer();
  });

  after(async () => {
    if (server) server.kill();
    await removeTestData();
    await pool.end();
  });

  it('answers the health check', async () => {
    const response = await call('GET', '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
  });

  it('registers a cluster, a namespace and two workloads with a day or two of history', async () => {
    const cluster = await call('POST', '/clusters', { name: CLUSTER, provider: 'test', region: 'nowhere' });
    assert.equal(cluster.status, 201);

    const namespace = await call('POST', '/clusters/' + cluster.body.id + '/namespaces', { name: 'ci' });
    assert.equal(namespace.status, 201);

    workloads.oversized = await createWorkload(namespace.body.id, 'oversized', 2, 2048, 0.3, 600);
    workloads.idle = await createWorkload(namespace.body.id, 'idle', 1, 512, 0.01, 40);
  });

  it('rejects bad input with a clear error', async () => {
    const missing = await call('POST', '/clusters', { region: 'nowhere' });
    assert.equal(missing.status, 400);

    const badType = await call('POST', '/recommendations', { workload_id: workloads.idle, type: 'idel' });
    assert.equal(badType.status, 400);

    const badStatus = await call('GET', '/recommendations?status=bogus');
    assert.equal(badStatus.status, 400);

    const unknown = await call('PATCH', '/recommendations/999999', { status: 'applied' });
    assert.equal(unknown.status, 404);
  });

  it('finds one oversized and one idle workload', async () => {
    const run = await call('POST', '/analysis/run');
    assert.equal(run.status, 200);

    const list = await call('GET', '/recommendations?status=open');
    const mine = list.body.filter((r) => r.cluster === CLUSTER);
    assert.equal(mine.length, 2);

    const rightsizing = mine.find((r) => r.type === 'rightsizing');
    assert.equal(rightsizing.workload_name, 'oversized');
    assert.equal(rightsizing.details.suggested_cpu, 0.39);
    assert.equal(rightsizing.details.suggested_memory_mb, 780);
    assert.ok(Number(rightsizing.estimated_monthly_savings) > 0);

    const idle = mine.find((r) => r.type === 'idle');
    assert.equal(idle.workload_name, 'idle');
  });

  it('does not create duplicates when the analysis runs again', async () => {
    await call('POST', '/analysis/run');
    const list = await call('GET', '/recommendations?status=open');
    const mine = list.body.filter((r) => r.cluster === CLUSTER);
    assert.equal(mine.length, 2);
  });

  it('moves savings from identified to realized when a recommendation is applied', async () => {
    const before = await call('GET', '/summary');
    const list = await call('GET', '/recommendations?status=open');
    const target = list.body.find((r) => r.cluster === CLUSTER && r.type === 'idle');

    const changed = await call('PATCH', '/recommendations/' + target.id, { status: 'applied' });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.status, 'applied');

    const after = await call('GET', '/summary');
    const saving = Number(target.estimated_monthly_savings);
    assert.ok(after.body.savings_realized >= before.body.savings_realized + saving - 0.02);
    assert.ok(after.body.savings_identified <= before.body.savings_identified - saving + 0.02);
    assert.ok(after.body.cost_by_namespace.some((n) => n.cluster === CLUSTER && n.namespace === 'ci'));
  });
});
