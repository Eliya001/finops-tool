const clusterModel = require('../models/clusterModel');

async function addCluster(req, res) {
  try {
    const { name, provider, region } = req.body;

    if (!name || !provider) {
      return res.status(400).json({ error: 'name and provider are required' });
    }

    const cluster = await clusterModel.createCluster(name, provider, region);
    res.status(201).json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listClusters(req, res) {
  try {
    const clusters = await clusterModel.getAllClusters();
    res.json(clusters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addCluster, listClusters };
