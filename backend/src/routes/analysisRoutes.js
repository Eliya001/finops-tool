const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

router.post('/run', analysisController.runAnalysisNow);

module.exports = router;
