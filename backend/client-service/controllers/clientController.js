const { getEvents, purchaseTickets: modelPurchaseTickets } = require('../models/clientModel.js');

const listEvents = (req, res) => {
	const events = getEvents();
	res.json(events);
};

const purchaseTickets = async (req, res, next) => {
	const eventId = parseInt(req.params.id, 10);
	const qty = req.body && req.body.quantity ? parseInt(req.body.quantity, 10) : 1;

	if (!eventId || eventId <= 0 || qty <= 0) {
		const err = new Error('Invalid event id or quantity');
		err.statusCode = 400;
		throw err;
	}

	try {
		const result = await modelPurchaseTickets(eventId, qty);
		if (result && result.success) {
			res.json(result.event);
		} else {
			res.status(409).json({ error: result && result.message ? result.message : 'Unable to complete purchase' });
		}
	} catch (e) {
		next(e);
	}
};

module.exports = { listEvents, purchaseTickets };
