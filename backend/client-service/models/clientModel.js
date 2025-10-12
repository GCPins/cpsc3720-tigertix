const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');
const INIT_SQL = path.join(__dirname, '..', '..', 'shared-db', 'init.sql');

let db = null;
try {
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 5000');
} catch (e) {
  db = null;
}

const ensureSchema = () => {
  if (!db) return false;
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Event'").get();
    if (!row) {
      if (fs.existsSync(INIT_SQL)) {
        const sql = fs.readFileSync(INIT_SQL, 'utf8');
        db.exec(sql);
        return true;
      }
      return false;
    }
    return true;
  } catch (e) {
    // unexpected DB error
    throw e;
  }
};

const getEvents = () => {
  if (!db) throw new Error('Database not available');
  const ok = ensureSchema();
  if (!ok) throw new Error('Database schema not initialized');
  try {
    const stmt = db.prepare('SELECT event_id as id, event_name as name, event_date as date, event_location as location, event_tickets_remaining as capacity FROM Event');
    return stmt.all();
  } catch (e) {
    throw new Error('Database error while fetching events');
  }
};

const purchaseTickets = (eventId, qty) => {
  if (!db) return Promise.resolve({ success: false, message: 'Database not available' });
  const ok = ensureSchema();
  if (!ok) return Promise.resolve({ success: false, message: 'Database schema not initialized' });

  const txn = db.transaction((id, q) => {
    const selectStmt = db.prepare('SELECT event_id as id, event_name as name, event_date as date, event_location as location, event_tickets_remaining as capacity FROM Event WHERE event_id = ?');
    const ev = selectStmt.get(id);
    if (!ev) return { success: false, message: 'Event not found' };
    if (ev.capacity === null || ev.capacity === undefined) return { success: false, message: 'Event does not track capacity' };
    if (ev.capacity < q) return { success: false, message: 'Not enough tickets available' };
    const updateStmt = db.prepare('UPDATE Event SET event_tickets_remaining = event_tickets_remaining - ? WHERE event_id = ?');
    updateStmt.run(q, id);
    const updated = selectStmt.get(id);
    return { success: true, event: updated };
  });

  try {
    const res = txn(eventId, qty);
    return Promise.resolve(res);
  } catch (e) {
    // unexpected DB error; throw so controller's next(e) will handle it
    throw e;
  }
};

module.exports = { getEvents, purchaseTickets };
