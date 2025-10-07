-- CONFIG
PRAGMA foreign_keys = ON;

-- TABLES
DROP TABLE IF EXISTS Event;
CREATE TABLE Event (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_location TEXT NOT NULL,
    event_capacity INTEGER --ticket capacity
);

DROP TABLE IF EXISTS Ticket;
CREATE TABLE Ticket (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    ticket_price REAL,
    ticket_type TEXT,
    FOREIGN KEY (event_id) REFERENCES Event(event_id)
);