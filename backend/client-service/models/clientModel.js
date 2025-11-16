const path = require('path');
const fs = require('fs');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const getPasswordHash = async (plaintextPassword) => {
  const hash = await bcrypt.hash(plaintextPassword, saltRounds);
  return hash;
};

const comparePassword = async (plaintextPassword, expectedHash) => {
  const match = await bcrypt.compare(plaintextPassword, expectedHash);
  return match;
}

require('dotenv').config({ path: path.join(__dirname, '../.env') }); 
const GEMINI_KEY = process.env.GEMINI_API_KEY;

console.log(
  "GEMINI_KEY:",
  GEMINI_KEY ? "FOUND" : "NOT FOUND - set the GEMINI_API_KEY environment variable."
);

// LLM deps (node-fetch, @google/genai) are loaded lazily to avoid ESM parsing issues in tests
let ai = null;
let Type = null;
let _fetch = null;
const llmModel = "gemini-2.5-flash-lite";
const llmPrompt = `
"You are a simple chat agent that assists users with booking events at Clemson University (Go Tigers!). Your responses will be kept brief but informative. Any output must be structured in JSON format, following these rules:
- If the user's request is coherent and they have request a valid number of tickets for an existing event, respond with this JSON output:
  > { 'event': { 'name': 'EVENT NAME HERE', 'quantity': NUMBER_OF_TICKETS_HERE } }
- If the user's request is incoherent, missing the event name, quantity of tickets, or invalid, respond with this JSON output:
  > { 'error': { 'msg': 'REASON FOR INVALID USER REQUEST HERE' } }

NOTE THAT every response must exlusively be in the JSON format provided above - no extra fluff! For an "error" response, see the bullet point above and ensure that the "message" response is directed towards the user (the user must request both the number of tickets and event name in each request!).

Here are the events that are available, and the max number of tickets that can be reserved:\n`;

const Database = require('better-sqlite3');

// Path to shared SQLite database and initialization script, allow override for tests.
const DEFAULT_DB = path.join(__dirname, '..', '..', 'shared-db', 'database.sqlite');
const DB_FILE = process.env.TIGERTIX_DB_PATH || DEFAULT_DB;
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

const generateResponse = async (userMsg) => {
  try {
    if (!_fetch) {
      _fetch = (await import('node-fetch')).default;
    }
    if (!ai) {
      const genai = await import('@google/genai');
      const { GoogleGenAI, Type: _Type } = genai;
      Type = _Type;
      ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    }

    const events = await _fetch("http://localhost:6001/api/events").then((res) => res.json());  
    const availEvents = JSON.stringify(events);  

    const request = userMsg;
    
    const res2 = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: request,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          event: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.INTEGER,
              },
              name: {
                type: Type.STRING,
              },
              quantity: {
                type: Type.INTEGER,
              },
            },
          },
          error: {
            type: Type.OBJECT,
            properties: {
              msg: {
                type: Type.STRING,
              },
            },
          },
        },
      },
      systemInstruction: [
          {
            text: `You are a simple chat agent that assists users with booking events at Clemson University (Go Tigers!). Your responses will be kept brief but informative. Any output must be structured in JSON format, following these rules:

      If the user's request is somewhat coherent and they have, in one way or the other, requested a valid number of tickets for an existing event, respond with this JSON output:

          { 'event': { 'id': EVENT_ID_HERE, 'name': 'EVENT NAME HERE', 'quantity': NUMBER_OF_TICKETS_HERE } }

      If the user's request is incoherent or invalid, respond with this JSON output:

          { 'error': { 'msg': 'REASON FOR INVALID USER REQUEST HERE' } }

  NOTE THAT every response must exlusively be in the JSON format provided above - no extra fluff! For an "error" response, see the bullet point above and ensure that the "message" response is directed towards the user (the user must request enough information to ascertain which event - and how many tickets for that event - they wish to attend).

  Here are the events that are available, and the max number of tickets that can be reserved:
          ${availEvents}`,
          }
        ],
      },
    });

    return res2.text;
  } catch (err) {
    throw(err);
  }
}

const processLlm = async (msg) => {
  try {
    // Accept raw text input; this endpoint is not intended for structured JSON payloads.
    const userMsg = msg.toString();

    const llmResponse = await generateResponse(userMsg);

    return llmResponse;
  } catch (err) {
    throw err;
  }
}

const ensureUserRegSchema = async (userData) => {
  if (!userData) {
    return false;
  }

  const { email, password, firstName, lastName } = userData;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string' ||
      !firstName || typeof firstName !== 'string' || !lastName || typeof lastName !== 'string') {
    return false;
  }

  return true;
}

const ensureUserLogSchema = async (credentials) => {
  if (!credentials) {
    return false;
  }

  const { email, password } = credentials;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return false;
  }

  return true;
}

const modelRegisterUser = async (userData) => {
  if (!ensureUserRegSchema(userData)) {
    throw new Error('The provided request was invalid - please confirm that all required fields are included in the correct format.');
  }

  const hashedPassword = await getPasswordHash(userData.password);

  const createUserStmt = db.prepare(`
      INSERT INTO User (email, password_hash, fname, lname)
      VALUES (?, ?, ?, ?)`);
  const result = await createUserStmt.run(userData.email, hashedPassword, userData.firstName, userData.lastName);

  return { userId: result.lastInsertRowid };
};

const modelLoginUser = async (credentials) => {
  // Simulate user login logic
  if (!ensureUserLogSchema(credentials)) {
    throw new Error('The provided login request was invalid - please confirm that all required fields are included in the correct format.');
  }

  const userPassHash = await db.get(`SELECT password_hash FROM User WHERE email = ?`, credentials.email);

  const passwordMatch = userPassHash ? await comparePassword(credentials.password, userPassHash) : false;

  if (!passwordMatch) {
    throw new Error('Invalid email or password.');
  }

  // placeholder
  return { token: 'abcde-12345' };
};

module.exports = { getEvents, purchaseTickets, processLlm, modelRegisterUser, modelLoginUser };