const path = require('path');
//const Database = require('better-sqlite3');

//const DB_FILE = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');

let db;
// try {
//   db = new Database(DB_FILE);
// } catch (e) {
//   // DB may not exist yet; we'll handle by falling back where appropriate
//   db = null;
// }

const getEvents = () => {
  if (!db) {
    return [
      { id: 1, name: 'Clemson Football Game', date: '2025-09-01' },
      { id: 2, name: 'Campus Concert', date: '2025-09-10' },
      { id: 3, name: 'Career Fair', date: '2025-09-15' }
    ];
  }

  try {
    const stmt = db.prepare('SELECT event_id as id, event_name as name, event_date as date, event_location as location, event_capacity as capacity FROM Event');
    return stmt.all();
  } catch (e) {
    // If table missing or other DB error, fall back to static list
    return [
      { id: 1, name: 'Clemson Football Game', date: '2025-09-01' },
      { id: 2, name: 'Campus Concert', date: '2025-09-10' },
      { id: 3, name: 'Career Fair', date: '2025-09-15' }
    ];
  }
};

// purchaseTickets: atomically decrement event_capacity by qty if enough tickets remain.
// Returns { success: true, event: { ... } } on success.
// Returns { success: false, message: '...' } on business failure (not enough tickets).
// Throws on unexpected DB errors.
const purchaseTickets = (eventId, qty) => {
  if (!db) {
    return Promise.resolve({ success: false, message: 'Database not initialized' });
  }

  const txn = db.transaction((id, q) => {
    const selectStmt = db.prepare('SELECT event_id as id, event_name as name, event_date as date, event_location as location, event_capacity as capacity FROM Event WHERE event_id = ?');
    const ev = selectStmt.get(id);
    if (!ev) {
      return { success: false, message: 'Event not found' };
    }
    if (ev.capacity === null || ev.capacity === undefined) {
      return { success: false, message: 'Event does not track capacity' };
    }
    if (ev.capacity < q) {
      return { success: false, message: 'Not enough tickets available' };
    }

    const updateStmt = db.prepare('UPDATE Event SET event_capacity = event_capacity - ? WHERE event_id = ?');
    updateStmt.run(q, id);

    // Return the updated event row
    const updated = selectStmt.get(id);
    return { success: true, event: updated };
  });

  try {
    const res = txn(eventId, qty);
    return Promise.resolve(res);
  } catch (e) {
    return Promise.reject(e);
  }
};

module.exports = { getEvents, purchaseTickets };
