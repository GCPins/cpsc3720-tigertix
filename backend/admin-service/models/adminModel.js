const path = require('path');

// Allow tests to override DB path via env var
const DEFAULT_DB = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');
const DB_FILE = process.env.TIGERTIX_DB_PATH || DEFAULT_DB;
const db = require('better-sqlite3')(DB_FILE);
db.pragma('busy_timeout = 5000');

/**
 * Creates a new event record in the database.
 *
 * @param {Object} eventData - Event details including name (string), datetime (ISO string), location (string), capacity (non-negative number).
 * @returns {Object} The newly created event object including the generated ID.
 * @throws {Error} If the database operation fails.
 */
const makeEvent = async (eventData) => {
  try {
    const sqlStmt = db.prepare('INSERT INTO Event (event_name, event_datetime, event_location, event_tickets_remaining) VALUES (?, ?, ?, ?)');
    const sqlRes = sqlStmt.run(eventData.name, eventData.datetime, eventData.location, eventData.capacity);
  return {id: sqlRes.lastInsertRowid, name: eventData.name, datetime: eventData.datetime, location: eventData.location, capacity: eventData.capacity};
  } catch (err) {
    // Re-throw the error for the controller to handle.
    throw err;
  }
}

module.exports = { makeEvent };
