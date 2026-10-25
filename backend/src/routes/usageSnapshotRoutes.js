const express = require('express');
const router = express.Router({ mergeParams: true });
const usageSnapshotController = require('../controllers/usageSnapshotController');

router.post('/', usageSnapshotController.addUsageSnapshot);
router.get('/', usageSnapshotController.listUsageSnapshots);

module.exports = router;
