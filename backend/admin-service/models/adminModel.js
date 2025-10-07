const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'shared-db/database.sqlite');
const db = require('better-sqlite3')(DB_FILE);

const makeEvent = async (eventData) => {
  const sqlStmt = await db.prepare('INSERT INTO Event (event_name, event_date, event_location, event_capacity) VALUES (?, ?, ?, ?)');
  const sqlRes = await sqlStmt.run(eventData.name, eventData.date, eventData.location, eventData.capacity);

  return {id: sqlRes.lastInsertRowid, name: eventData.name, date: eventData.date, location: eventData.location, capacity: eventData.capacity};
}

module.exports = { makeEvent };
