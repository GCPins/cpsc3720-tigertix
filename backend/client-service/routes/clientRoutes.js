const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets, parseLlm, registerUser, loginUser } = require('../controllers/clientController.js');
const { verifyJWTToken } = require('../models/clientModel.js');

router.get('/events', verifyJWTToken, listEvents);
router.post('/events/:id/purchase', verifyJWTToken, purchaseTickets);
router.post('/llm/parse', verifyJWTToken, parseLlm);
router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
