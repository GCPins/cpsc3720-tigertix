const { getEvents } = require('../models/model');

const listEvents = (req, res) => {
  const events = getEvents();
  res.json(events);
};

module.exports = { listEvents };
