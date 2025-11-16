const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets, parseLlm, registerUser, loginUser, getUserProfile } = require('../controllers/clientController.js');
const { verifyJWTToken } = require('../models/clientModel.js');

// GET (protected)
router.get('/events', verifyJWTToken, listEvents);
router.get('/profile', verifyJWTToken, getUserProfile);

// POST (protected)
router.post('/events/:id/purchase', verifyJWTToken, purchaseTickets);
router.post('/llm/parse', verifyJWTToken, parseLlm);
// POST (public)
router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
