const usageSnapshotModel = require('../models/usageSnapshotModel');

async function addUsageSnapshot(req, res) {
  try {
    const { workloadId } = req.params;
    const { actual_cpu_used, actual_memory_used, timestamp } = req.body;

    if (actual_cpu_used === undefined || actual_memory_used === undefined) {
      return res.status(400).json({ error: 'actual_cpu_used and actual_memory_used are required' });
    }

    const snapshot = await usageSnapshotModel.createUsageSnapshot(
      workloadId,
      actual_cpu_used,
      actual_memory_used,
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

async function listUsageSnapshots(req, res) {
  try {
    const { workloadId } = req.params;
    const snapshots = await usageSnapshotModel.getUsageSnapshotsByWorkload(workloadId);
    res.json(snapshots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addUsageSnapshot, listUsageSnapshots };
