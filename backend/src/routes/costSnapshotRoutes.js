const express = require('express');
const router = express.Router({ mergeParams: true });
const costSnapshotController = require('../controllers/costSnapshotController');

router.post('/', costSnapshotController.addCostSnapshot);
router.get('/', costSnapshotController.listCostSnapshots);

module.exports = router;
