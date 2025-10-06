const db = require('better-sqlite3')('../shared-db/database.sqlite');

const makeEvent = (eventData) => {
  const sqlStmt = db.prepare('INSERT INTO Event (event_name, event_date, event_location, event_capacity) VALUES (?, ?, ?, ?)');
  const sqlRes = sqlStmt.run(eventData.name, eventData.date, eventData.location, eventData.capacity);

  return {id: sqlRes.lastInsertRowid, name: eventData.name, date: eventData.date, location: eventData.location, capacity: eventData.capacity};
}

module.exports = { makeEvent };