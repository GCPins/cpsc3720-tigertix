const DB_FILE = '../shared-db/database.sqlite';
const SETUP_FILE = '../shared-db/init.sql';

const fs = require('fs');
const db = require('better-sqlite3')(DB_FILE);

if (fs.statSync(DB_FILE).size > 0) {
  console.log('Database file already exists, no action will be taken.\nTo overwrite the existing database file, please first delete it then run this script again.\n\nDB File: ' + DB_FILE);
} else {
  console.log('Database file does not exist, will run SQL setup script and create database.');
  db.exec(fs.readFileSync(SETUP_FILE, 'utf8'));
  console.log('Database setup complete!\n\nDB File: ' + DB_FILE);
}
