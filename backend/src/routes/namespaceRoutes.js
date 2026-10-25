const express = require('express');
const router = express.Router({ mergeParams: true });
const namespaceController = require('../controllers/namespaceController');

router.post('/', namespaceController.addNamespace);
router.get('/', namespaceController.listNamespaces);

module.exports = router;
