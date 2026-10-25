const workloadModel = require('../models/workloadModel');

async function addWorkload(req, res) {
  try {
    const { namespaceId } = req.params;
    const { name, kind, requested_cpu, requested_memory } = req.body;

    if (!name || !kind) {
      return res.status(400).json({ error: 'name and kind are required' });
    }

    const workload = await workloadModel.createWorkload(
      namespaceId,
      name,
      kind,
      requested_cpu,
      requested_memory
    );
    res.status(201).json(workload);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'namespace not found' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'workload already exists in this namespace' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listWorkloads(req, res) {
  try {
    const { namespaceId } = req.params;
    const workloads = await workloadModel.getWorkloadsByNamespace(namespaceId);
    res.json(workloads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addWorkload, listWorkloads };
