const { runAnalysis } = require('../analysis/analyze');

async function runAnalysisNow(req, res) {
  try {
    const summary = await runAnalysis();
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { runAnalysisNow };
