const { getEvents, purchaseTickets: modelPurchaseTickets, processLlm } = require('../models/clientModel.js');

/**
 * @function listEvents
 * @description Returns a list of all available events.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {void} Sends a JSON response with event data.
 * @throws {Error} If database access fails inside getEvents().
 */
const listEvents = (req, res) => {
  const events = getEvents();
  res.json(events);
};

/**
 * @function purchaseTickets
 * @description Attempts to purchase one or more tickets for a specific event.
 * @param {Object} req - Express request containing event ID in params and quantity in body.
 * @param {Object} res - Express response for sending JSON back to client.
 * @param {Function} next - Express next() for centralized error handling.
 * @returns {Promise<void>} Sends JSON with purchased event details or error message.
 * @throws {Error} If invalid input or unexpected server error occurs.
 */
const purchaseTickets = async (req, res, next) => {
  // Parse event ID from URL parameter, ensuring it’s an integer.
  const eventId = parseInt(req.params.id, 10);

  // Parse quantity from request body, defaulting to 1 if not provided.
  const qty = req.body && req.body.quantity ? parseInt(req.body.quantity, 10) : 1;

  // Input validation: ensure both eventId and quantity are positive integers.
  if (!eventId || eventId <= 0 || qty <= 0) {
    const err = new Error('Invalid event id or quantity');
    err.statusCode = 400; // Bad Request
    throw err;
  }

  try {
    // Delegate actual purchase logic to model layer.
    const result = await modelPurchaseTickets(eventId, qty);

    // Successful purchase: return updated event object.
    if (result && result.success) {
      res.json(result.event);
    } else {
      // Business failure (e.g., sold out): return a 409 Conflict.
      res.status(409).json({
        error: result && result.message ? result.message : 'Unable to complete purchase'
      });
    }
  } catch (e) {
    // Pass unexpected errors to centralized error middleware.
    next(e);
  }
};
 
const parseLlm = async(req, res, next) => {
  try {
    const llmResponse = await processLlm(req.body);

    res.status(200).json(llmResponse);
  } catch (err) {
    next(err);
  }
}

module.exports = { listEvents, purchaseTickets, parseLlm };