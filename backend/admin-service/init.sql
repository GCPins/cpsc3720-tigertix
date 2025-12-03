-- CONFIG
PRAGMA foreign_keys = ON;

-- TABLES
DROP TABLE IF EXISTS Event;
CREATE TABLE Event (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_datetime DATETIME NOT NULL,
    event_location TEXT NOT NULL,
    event_tickets_remaining INTEGER NOT NULL
);

-- USERS
DROP TABLE IF EXISTS User;
CREATE TABLE User (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    fname TEXT NOT NULL,
    lname TEXT NOT NULL
);
