const express = require('express');
const router = express.Router();

const { createEvent, parseLlm } = require('../controllers/adminController.js');

// magical POST route for creating an event
router.post('/events', createEvent);
router.post('/llm/parse', parseLlm);

module.exports = router;
