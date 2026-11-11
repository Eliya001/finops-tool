const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateWorkload, suggest } = require('../src/analysis/analyze');

// A workload as the database query returns it (numbers arrive as text)
function stats(overrides) {
  return {
    id: 1,
    name: 'demo',
    requested_cpu: '2',
    requested_memory: '2048',
    samples: '168',
    p95_cpu: 0.3,
    max_mem: '600',
    ...overrides,
  };
}

// Monthly cost of the CPU and memory it asked for
const cost = { cpu: 47.52, memory: 6.48 };

describe('suggest', () => {
  it('shrinks a request that is far bigger than needed', () => {
    const result = suggest(2, 0.3);
    assert.equal(Math.round(result.value * 1000) / 1000, 0.39);
    assert.ok(result.reduction > 0.8);
  });

  it('keeps 30% headroom above what is needed', () => {
    assert.equal(Math.round(suggest(1000, 400).value), 520);
  });

  it('leaves a request alone when the saving would be under 30%', () => {
    const result = suggest(1, 0.6);
    assert.equal(result.value, 1);
    assert.equal(result.reduction, 0);
  });

  it('never suggests more than what is already requested', () => {
    const result = suggest(1, 0.9);
    assert.equal(result.value, 1);
    assert.equal(result.reduction, 0);
  });
});

describe('evaluateWorkload', () => {
  it('recommends rightsizing for an oversized workload', () => {
    const result = evaluateWorkload(stats({ p95_cpu: 0.4 }), cost);
    assert.equal(result.type, 'rightsizing');
    assert.equal(result.details.current_cpu, 2);
    assert.equal(result.details.suggested_cpu, 0.52);
    assert.equal(result.details.suggested_memory_mb, 780);
    assert.ok(result.savings > 30 && result.savings < 47);
  });

  it('recommends idle for a workload that uses almost nothing', () => {
    const result = evaluateWorkload(
      stats({ requested_cpu: '1', requested_memory: '512', p95_cpu: 0.013, max_mem: '42' }),
      { cpu: 23.76, memory: 1.62 }
    );
    assert.equal(result.type, 'idle');
    assert.equal(result.savings, 25.38);
  });

  it('recommends nothing for a workload that is sized well', () => {
    const result = evaluateWorkload(
      stats({ requested_cpu: '1', requested_memory: '1024', p95_cpu: 0.85, max_mem: '735' }),
      { cpu: 23.76, memory: 3.24 }
    );
    assert.equal(result, null);
  });

  it('skips a workload with less than a day of data', () => {
    assert.deepEqual(evaluateWorkload(stats({ samples: '10' }), cost), { skipped: true });
  });

  it('skips a workload with no cost data', () => {
    assert.deepEqual(evaluateWorkload(stats(), undefined), { skipped: true });
  });

  it('skips a workload that did not state its requests', () => {
    assert.deepEqual(evaluateWorkload(stats({ requested_cpu: null }), cost), { skipped: true });
    assert.deepEqual(evaluateWorkload(stats({ requested_memory: null }), cost), { skipped: true });
  });

  it('is not idle when CPU use is exactly at the threshold', () => {
    const result = evaluateWorkload(
      stats({ requested_cpu: '1', requested_memory: '512', p95_cpu: 0.05, max_mem: '42' }),
      { cpu: 23.76, memory: 1.62 }
    );
    assert.notEqual(result && result.type, 'idle');
  });

  it('calls a workload idle before looking at rightsizing', () => {
    const result = evaluateWorkload(
      stats({ requested_cpu: '4', requested_memory: '4096', p95_cpu: 0.01, max_mem: '50' }),
      cost
    );
    assert.equal(result.type, 'idle');
  });
});
