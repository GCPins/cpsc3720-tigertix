const express = require('express');
const router = express.Router();

const { createEvent } = require('../controllers/adminController.js');

router.post('/events', createEvent);

module.exports = router;
