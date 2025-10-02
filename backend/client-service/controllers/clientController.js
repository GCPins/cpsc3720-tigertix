const { getEvents } = require('../models/clientModel.js');

const listEvents = (req, res) => {
  const events = getEvents();
  res.json(events);
};

module.exports = { listEvents };
