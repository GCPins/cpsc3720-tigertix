const { makeEvent } = require('../models/adminModel.js');

/**
 * Verifies the event data in the request
 * 
 * @param {Object} req - The API request object
 * 
 * @return {null} Returns null/nothing
 * @throws Will throw an error if the API request is invalid (bad formatting, fields missing, wrong field types, etc.)
 */
const verifyEventData = (req) => {  
  if (!req.is('application/json') || !req.body) {
    const err = new Error("Request body must be in JSON format.");
    err.statusCode = 400;
    throw(err);
  }

  const data = req.body;
  if (!data.name || !data.date || !data.location || data.capacity == null) {
    const err = new Error("Event must include name, date, capacity, and location.");
    err.statusCode = 400;
    throw(err);
  }

  if (typeof data.name !== 'string' || typeof data.date !== 'string' || typeof data.location !== 'string' || typeof data.capacity !== 'number') {
    const err = new Error("Event name, date, and location must be strings, capacity must be a number.");
    err.statusCode = 400;
    throw(err);
  }

  if (data.capacity < 0) {
    const err = new Error("Event capacity must be a non-negative number.");
    err.statusCode = 400;
    throw(err);
  }

  const d = new Date(data.date);
  if (isNaN(d) || d.getFullYear() < 1000) {
    const err = new Error("Event date must be a valid date (YYYY-MM-DD).");
    err.statusCode = 400;
    throw(err);
  }
}

// simple event creation (with validation and error handling)
const createEvent = async (req, res, next) => {
  try {
    verifyEventData(req);

    const newEvent = await makeEvent(req.body);
    
    res.status(201).json(newEvent);
  } catch (err) {
    next(err);
  }
};

module.exports = { createEvent };
