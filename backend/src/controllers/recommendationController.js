const recommendationModel = require('../models/recommendationModel');

const TYPES = ['rightsizing', 'idle', 'orphaned'];
const STATUSES = ['open', 'applied', 'dismissed'];

async function addRecommendation(req, res) {
  try {
    const { workload_id, type, estimated_monthly_savings, details } = req.body;

    if (!workload_id || !type) {
      return res.status(400).json({ error: 'workload_id and type are required' });
    }
    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: 'type must be rightsizing, idle or orphaned' });
    }

    const recommendation = await recommendationModel.createRecommendation(
      workload_id,
      type,
      estimated_monthly_savings,
      details
    );
    res.status(201).json(recommendation);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'workload not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listRecommendations(req, res) {
  try {
    const { status } = req.query;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'status must be open, applied or dismissed' });
    }

    const recommendations = await recommendationModel.getRecommendations(status);
    res.json(recommendations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function changeStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'status must be open, applied or dismissed' });
    }

    const recommendation = await recommendationModel.updateRecommendationStatus(id, status);
    if (!recommendation) {
      return res.status(404).json({ error: 'recommendation not found' });
    }
    res.json(recommendation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addRecommendation, listRecommendations, changeStatus };
