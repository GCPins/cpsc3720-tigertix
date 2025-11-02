const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets, parseLlm } = require('../controllers/clientController.js');

router.get('/events', listEvents);
router.post('/events/:id/purchase', purchaseTickets);
router.post('/llm/parse', parseLlm);

module.exports = router;
