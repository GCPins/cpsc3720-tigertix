const fs = require('fs');
const { DatabaseSync } = require('sqlite');

const DB_FILE = '../shared-db/database.sqlite';
const SETUP_FILE = '../shared-db/init.sql';
const db = new DatabaseSync(DB_FILE);

function setupDB() {
  // set up database
  database.exec(SETUP_FILE)
  return;
}

if (fs.existsSync(DB_FILE)) {
  console.log('Database file already exists, no action will be taken.\nTo overwrite the existing database file, please first delete it then run this script again.\n\nDB File: ' + DB_FILE);
} else {
  console.log('Database file does not exist, will run SQL setup script and create database.');
  setupDB();
  console.log('Database setup complete!\n\nDB File: ' + DB_FILE);
}
