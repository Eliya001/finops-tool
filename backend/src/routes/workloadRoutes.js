const express = require('express');
const router = express.Router({ mergeParams: true });
const workloadController = require('../controllers/workloadController');

router.post('/', workloadController.addWorkload);
router.get('/', workloadController.listWorkloads);

module.exports = router;
