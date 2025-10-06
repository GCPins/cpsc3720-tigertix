const { makeEvent } = require('../models/adminModel.js');

const createEvent = (req, res) => {
  const newEvent = makeEvent(req.body);
  res.json(newEvent);
};

module.exports = { createEvent };
