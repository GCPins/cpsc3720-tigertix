const express = require('express');
const router = express.Router();

const { createEvent } = require('../controllers/adminController.js');

// magical POST route for creating an event
router.post('/events', createEvent);

module.exports = router;
