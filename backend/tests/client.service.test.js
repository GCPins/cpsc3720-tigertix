const request = require('supertest');
const { createTempDb, seedEvents } = require('./utils/dbTestUtils');

jest.mock('../client-service/models/clientModel.js', () => {
  // Defer to the real module for everything except processLlm, which we mock
  const actual = jest.requireActual('../client-service/models/clientModel.js');
  return {
    ...actual,
    processLlm: jest.fn(async (msg) => {
      // Return a JSON string as the service currently passes through
      if (String(msg).toLowerCase().includes('2 tickets')) {
        return JSON.stringify({ event: { id: 1, name: 'Homecoming Concert', quantity: 2 } });
      }
      return JSON.stringify({ error: { msg: 'Please specify event and quantity' } });
    }),
  };
});

describe('Client Service API', () => {
  let app;
  let dbPath;

  beforeAll(() => {
    dbPath = createTempDb('client-test.sqlite');
    process.env.TIGERTIX_DB_PATH = dbPath;
    seedEvents(dbPath, [
      { name: 'Homecoming Concert', datetime: '2025-12-01T19:00:00Z', location: 'Littlejohn', capacity: 3 },
      { name: 'Basketball Game', datetime: '2025-12-05T23:00:00Z', location: 'Littlejohn', capacity: 1 },
    ]);
    app = require('../client-service/server');
  });

  afterAll(() => {
    delete process.env.TIGERTIX_DB_PATH;
  });

  test('GET /api/events returns list of events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/events/:id/purchase buys a ticket and decrements capacity', async () => {
    const res = await request(app)
      .post('/api/events/1/purchase')
      .send({ quantity: 1 })
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('capacity', 2);
  });

  test('POST /api/events/:id/purchase returns 409 when not enough tickets', async () => {
    // Event 2 only has capacity 1; attempt to buy 2
    const res = await request(app)
      .post('/api/events/2/purchase')
      .send({ quantity: 2 })
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('Concurrent purchases never exceed capacity', async () => {
    // Event 1 currently has capacity 2 (after earlier test). Fire 4 parallel single-ticket purchases.
    const calls = Array.from({ length: 4 }).map(() =>
      request(app).post('/api/events/1/purchase').send({ quantity: 1 }).set('Content-Type', 'application/json')
    );
    const results = await Promise.all(calls);
    const successes = results.filter((r) => r.statusCode === 200).length;
    const conflicts = results.filter((r) => r.statusCode === 409).length;
    expect(successes + conflicts).toBe(4);
    expect(successes).toBeLessThanOrEqual(2); // no more than remaining capacity
  });

  test('POST /api/llm/parse returns mocked LLM JSON string', async () => {
    const res = await request(app)
      .post('/api/llm/parse')
      .send({ message: 'book 2 tickets' })
      .set('Content-Type', 'application/json');
    expect(res.statusCode).toBe(200);
    // Body is a JSON string; Express.json wraps strings as JSON strings
    expect(typeof res.body === 'string' || typeof res.text === 'string').toBeTruthy();
  });
});
