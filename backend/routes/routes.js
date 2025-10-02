const express = require('express');
const router = express.Router();
const { listEvents } = require('../controllers/controller');

router.get('/events', listEvents);

module.exports = router;
