const summaryModel = require('../models/summaryModel');

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function getSummary(req, res) {
  try {
    const byNamespace = await summaryModel.getMonthlyCostByNamespace();
    const totals = await summaryModel.getRecommendationTotals();

    const costByNamespace = byNamespace.map((row) => ({
      cluster: row.cluster,
      namespace: row.namespace,
      monthly_cost: round(row.monthly_cost),
    }));
    const monthlyCost = costByNamespace.reduce((sum, row) => sum + row.monthly_cost, 0);

    const open = totals.find((t) => t.status === 'open');
    const applied = totals.find((t) => t.status === 'applied');

    res.json({
      monthly_cost: round(monthlyCost),
      savings_identified: open ? round(open.savings) : 0,
      savings_realized: applied ? round(applied.savings) : 0,
      open_recommendations: open ? Number(open.count) : 0,
      cost_by_namespace: costByNamespace,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getSummary };
