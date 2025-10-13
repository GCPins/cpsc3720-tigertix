const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Path to shared SQLite database and initialization script.
const DB_FILE = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');
const INIT_SQL = path.join(__dirname, '..', '..', 'shared-db', 'init.sql');

let db = null;
try {
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 5000'); // Prevents DB locking errors under concurrent load.
} catch (e) {
  db = null; // Fail gracefully if DB connection fails.
}

/**
 * @function ensureSchema
 * @description Checks if the Event table exists; if not, initializes schema from init.sql.
 * @returns {boolean} True if schema is valid/ready, false otherwise.
 * @throws {Error} If a DB query or file read unexpectedly fails.
 */
const ensureSchema = () => {
  if (!db) return false;
  try {
    // Check if 'Event' table exists.
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='Event'"
    ).get();

    // Initialize DB schema if missing.
    if (!row) {
      if (fs.existsSync(INIT_SQL)) {
        const sql = fs.readFileSync(INIT_SQL, 'utf8');
        db.exec(sql);
        return true;
      }
      return false; // Schema not present and no init file found.
    }
    return true;
  } catch (e) {
    // Re-throw unexpected DB error to be handled upstream.
    throw e;
  }
};

/**
 * @function getEvents
 * @description Fetches all events from the database.
 * @returns {Array<Object>} Array of event objects with id, name, datetime, location, and capacity.
 * @throws {Error} If database unavailable, schema invalid, or query fails.
 */
const getEvents = () => {
  if (!db) throw new Error('Database not available');

  const ok = ensureSchema();
  if (!ok) throw new Error('Database schema not initialized');

  try {
    const stmt = db.prepare(`
      SELECT event_id AS id,
             event_name AS name,
             event_datetime AS datetime,
             event_location AS location,
             event_tickets_remaining AS capacity
      FROM Event
    `);
    return stmt.all();
  } catch (e) {
    throw new Error('Database error while fetching events');
  }
};

/**
 * @function purchaseTickets
 * @description Handles ticket purchase transaction logic with validation and rollback safety.
 * @param {number} eventId - Unique ID of the event.
 * @param {number} qty - Quantity of tickets to purchase.
 * @returns {Promise<Object>} Promise resolving to 
 * { success:boolean, event?:Object, message?:string }.
 * @throws {Error} For unexpected database transaction errors.
 */
const purchaseTickets = (eventId, qty) => {
  if (!db)
    return Promise.resolve({ success: false, message: 'Database not available' });

  const ok = ensureSchema();
  if (!ok)
    return Promise.resolve({
      success: false,
      message: 'Database schema not initialized'
    });

  // Define transaction for atomic purchase (either all or none).
  const txn = db.transaction((id, q) => {
    // Fetch event to verify existence and capacity.
    const selectStmt = db.prepare(`
      SELECT event_id AS id,
             event_name AS name,
             event_datetime AS datetime,
             event_location AS location,
             event_tickets_remaining AS capacity
      FROM Event WHERE event_id = ?
    `);

    const ev = selectStmt.get(id);

    // Validation checks within transaction context.
    if (!ev) return { success: false, message: 'Event not found' };
    if (ev.capacity === null || ev.capacity === undefined)
      return { success: false, message: 'Event does not track capacity' };
    if (ev.capacity < q)
      return { success: false, message: 'Not enough tickets available' };

    // Deduct tickets from remaining capacity.
    const updateStmt = db.prepare(`
      UPDATE Event
      SET event_tickets_remaining = event_tickets_remaining - ?
      WHERE event_id = ?
    `);
    updateStmt.run(q, id);

    // Return updated event info.
    const updated = selectStmt.get(id);
    return { success: true, event: updated };
  });

  try {
    // Execute transaction safely.
    const res = txn(eventId, qty);
    return Promise.resolve(res);
  } catch (e) {
    // Re-throw so controller middleware can log/return error properly.
    throw e;
  }
};

module.exports = { getEvents, purchaseTickets };