const costSnapshotModel = require('../models/costSnapshotModel');

async function addCostSnapshot(req, res) {
  try {
    const { workloadId } = req.params;
    const { cpu_cost, memory_cost, total_cost, timestamp } = req.body;

    if (cpu_cost === undefined || memory_cost === undefined) {
      return res.status(400).json({ error: 'cpu_cost and memory_cost are required' });
    }

    const total = total_cost !== undefined ? total_cost : Number((Number(cpu_cost) + Number(memory_cost)).toFixed(6));

    const snapshot = await costSnapshotModel.createCostSnapshot(
      workloadId,
      cpu_cost,
      memory_cost,
      total,
      timestamp
    );
    res.status(201).json(snapshot);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'workload not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listCostSnapshots(req, res) {
  try {
    const { workloadId } = req.params;
    const snapshots = await costSnapshotModel.getCostSnapshotsByWorkload(workloadId);
    res.json(snapshots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addCostSnapshot, listCostSnapshots };
