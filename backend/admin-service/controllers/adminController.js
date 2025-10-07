const { makeEvent } = require('../models/adminModel.js');

const createEvent = async (req, res, next) => {
  if (!req.body) {
    // error!
    let err = new Error("A body (in JSON format) must be provided!");
    err.statusCode = 400;
    throw err;
  }

  const newEvent = await makeEvent(req.body);
  await res.json(newEvent);
};

module.exports = { createEvent };
