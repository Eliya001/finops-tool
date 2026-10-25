const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

router.post('/', recommendationController.addRecommendation);
router.get('/', recommendationController.listRecommendations);
router.patch('/:id', recommendationController.changeStatus);

module.exports = router;
