const express = require('express');
const { healthCheck } = require('../modules/health/health.controller');

const router = express.Router();

router.get('/', healthCheck);

module.exports = router;
