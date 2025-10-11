const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'shared-db/database.sqlite');
const db = require('better-sqlite3')(DB_FILE);

/** 
 * Creates a new event in the database
 * @param {Object} eventData - A JSON object containing the event details: name (string), date (a string, but in YYYY-MM-DD format), location (also a string), capacity (a non-negative number)
 * 
 * @returns {Object} The newly created event JSON object with its ID (and previously provided details)
 * @throws Will throw an error if the database operation(s) fail
**/
const makeEvent = async (eventData) => {
  try {
    const sqlStmt = db.prepare('INSERT INTO Event (event_name, event_date, event_location, event_capacity) VALUES (?, ?, ?, ?)');
    const sqlRes = sqlStmt.run(eventData.name, eventData.date, eventData.location, eventData.capacity);
  return {id: sqlRes.lastInsertRowid, name: eventData.name, date: eventData.date, location: eventData.location, capacity: eventData.capacity};
  } catch (err) {
    // re-throw the error for the controller to handle (gl, hf)
    throw(err);
  }
}

module.exports = { makeEvent };
