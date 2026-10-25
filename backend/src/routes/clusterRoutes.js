const express = require('express');
const router = express.Router();
const clusterController = require('../controllers/clusterController');

router.post('/', clusterController.addCluster);
router.get('/', clusterController.listClusters);

module.exports = router;
