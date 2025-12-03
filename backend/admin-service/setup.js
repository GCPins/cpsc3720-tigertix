const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, '..', 'shared-db/database.sqlite');
// const SETUP_FILE = path.join(__dirname, '..', 'shared-db/init.sql');
const SETUP_FILE = path.join(__dirname, './init.sql');

const db = new Database(DB_FILE);

function setup() {
  if (fs.statSync(DB_FILE).size > 0) {
    console.log('Database file already exists, no action will be taken.\nTo overwrite the existing database file, please first delete it then run this script again.\n\nDB File: ' + DB_FILE);
  } else {
    console.log('Database file does not exist, will run SQL setup script and create database.');
    db.exec(fs.readFileSync(SETUP_FILE, 'utf8'));
    console.log('Database setup complete!\n\nDB File: ' + DB_FILE);
  }
}

setup();
