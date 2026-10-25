const namespaceModel = require('../models/namespaceModel');

async function addNamespace(req, res) {
  try {
    const { clusterId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const namespace = await namespaceModel.createNamespace(clusterId, name);
    res.status(201).json(namespace);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'cluster not found' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'namespace already exists in this cluster' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listNamespaces(req, res) {
  try {
    const { clusterId } = req.params;
    const namespaces = await namespaceModel.getNamespacesByCluster(clusterId);
    res.json(namespaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addNamespace, listNamespaces };
