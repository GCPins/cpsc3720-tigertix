const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const INIT_SQL = path.join(__dirname, '..', '..', 'shared-db', 'init.sql');

function createTempDb(tmpName = 'test-db.sqlite') {
  const dbPath = path.join(__dirname, '..', 'tmp', tmpName);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  const schema = fs.readFileSync(INIT_SQL, 'utf8');
  db.exec(schema);
  db.close();
  return dbPath;
}

function seedEvents(dbPath, events) {
  const db = new Database(dbPath);
  const insert = db.prepare(
    'INSERT INTO Event (event_name, event_datetime, event_location, event_tickets_remaining) VALUES (?, ?, ?, ?)'
  );
  const txn = db.transaction((rows) => {
    for (const e of rows) insert.run(e.name, e.datetime, e.location, e.capacity);
  });
  txn(events);
  db.close();
}

module.exports = { createTempDb, seedEvents };
