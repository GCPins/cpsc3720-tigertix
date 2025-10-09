const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets } = require('../controllers/clientController.js');

router.get('/events', listEvents);
router.post('/events/:id/purchase', purchaseTickets);

module.exports = router;
