// MUST SET ENV VAR: GEMINI_API_KEY
// const { GoogleGenAI } = require('genai');
require('dotenv').config(); 
const GEMINI_KEY = process.env.GEMINI_API_KEY;

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
const llmModel = "gemini-2.5-flash-lite";
const llmPrompt = `
"You are a simple chat agent that assists users with booking events at Clemson University (Go Tigers!). Your responses will be kept brief but informative. Any output must be structured in JSON format, following these rules:
- If the user's request is coherent and they have request a valid number of tickets for an existing event, respond with this JSON output:
  > { 'event': { 'name': 'EVENT NAME HERE', 'quantity': NUMBER_OF_TICKETS_HERE } }
- If the user's request is incoherent, missing the event name, quantity of tickets, or invalid, respond with this JSON output:
  > { 'error': { 'msg': 'REASON FOR INVALID USER REQUEST HERE' } }

NOTE THAT every response must exlusively be in the JSON format provided above - no extra fluff! For an "error" response, see the bullet point above and ensure that the "message" response is directed towards the user (the user must request both the number of tickets and event name in each request!).

Here are the events that are available, and the max number of tickets that can be reserved:\n`;

const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'shared-db/database.sqlite');
const db = require('better-sqlite3')(DB_FILE);

/** 
 * Creates a new event with the provided details in the database
 * 
 * @param {Object} eventData - A JSON object containing the event details: name (string), date (a string, but in YYYY-MM-DD format), location (also a string), capacity (a non-negative number)
 * 
 * @returns {Object} The newly created event JSON object with its ID (and previously provided details)
 * @throws Will throw an error if the database operation(s) fail
**/
const makeEvent = async (eventData) => {
  try {
    const sqlStmt = db.prepare('INSERT INTO Event (event_name, event_datetime, event_location, event_tickets_remaining) VALUES (?, ?, ?, ?)');
    const sqlRes = sqlStmt.run(eventData.name, eventData.datetime, eventData.location, eventData.capacity);
  return {id: sqlRes.lastInsertRowid, name: eventData.name, datetime: eventData.datetime, location: eventData.location, capacity: eventData.capacity};
  } catch (err) {
    // re-throw the error for the controller to handle (gl, hf)
    throw(err);
  }
}

const generateResponse = async (userMsg) => {
  try {
    const events = fetch("http://localhost:6001/api/events").then((res) => { return res.json() });
    const eventsStr = JSON.stringify(events);  

    const request = llmPrompt + eventsStr + userMsg;

    const response = await ai.models.generateContent({
      model: llmModel,
      contents: request,
    });
    
    return response;
  } catch (err) {
    throw(err);
  }
}

const processLlm = async (msg) => {
  try {
    // should accept RAW/txt, not a structured json input!
    const userMsg = msg.toString();

    const llmResponse = await generateResponse(userMsg);

    return llmResponse;
  } catch (err) {
    throw(err);
  }
}

module.exports = { makeEvent };
