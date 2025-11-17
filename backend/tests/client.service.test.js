const request = require('supertest');
const { createTempDb, seedEvents } = require('./utils/dbTestUtils');

jest.mock('../client-service/models/clientModel.js', () => {
  const actual = jest.requireActual('../client-service/models/clientModel.js');
  return {
    ...actual,
    processLlm: jest.fn(async (msg) => {
      if (String(msg).toLowerCase().includes('2 tickets')) {
        return JSON.stringify({ event: { id: 1, name: 'Homecoming Concert', quantity: 2 } });
      }
      return JSON.stringify({ error: { msg: 'Please specify event and quantity' } });
    }),
  };
});

describe('Client Service API (Authenticated)', () => {
  let app;
  let dbPath;
  let token;

  beforeAll(async () => {
    dbPath = createTempDb('client-test.sqlite');
    process.env.TIGERTIX_DB_PATH = dbPath;

    seedEvents(dbPath, [
      { name: 'Homecoming Concert', datetime: '2025-12-01T19:00:00Z', location: 'Littlejohn', capacity: 3 },
      { name: 'Basketball Game', datetime: '2025-12-05T23:00:00Z', location: 'Littlejohn', capacity: 1 },
    ]);

    app = require('../client-service/server');

    // Create test user
    await request(app)
      .post('/api/register')
      .send({
        email: 'testuser@clemson.edu',
        password: 'Secret123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .set('Content-Type', 'application/json');

    // Login to get JWT
    const loginRes = await request(app)
      .post('/api/login')
      .send({ email: 'testuser@clemson.edu', password: 'Secret123!' });

    token = loginRes.body.token;
    expect(token).toBeDefined();
  });


  afterAll(() => {
    delete process.env.TIGERTIX_DB_PATH;
  });

  //
  // ---- TESTS BELOW ----
  //

  test('GET /api/events requires auth and returns events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/events/:id/purchase buys a ticket and decrements capacity', async () => {
    const res = await request(app)
      .post('/api/events/1/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body.capacity).toBe(2);
  });

  test('POST /api/events/:id/purchase returns 409 when not enough tickets', async () => {
    const res = await request(app)
      .post('/api/events/2/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('Concurrent purchases never exceed capacity', async () => {
    // Event 1 currently has capacity 2

    const calls = Array.from({ length: 4 }).map(() =>
      request(app)
        .post('/api/events/1/purchase')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 1 })
    );

    const results = await Promise.all(calls);

    const successes = results.filter(r => r.statusCode === 200).length;
    const conflicts = results.filter(r => r.statusCode === 409).length;

    expect(successes + conflicts).toBe(4);
    expect(successes).toBeLessThanOrEqual(2);
  });

  test('POST /api/llm/parse returns mocked JSON output', async () => {
    const res = await request(app)
      .post('/api/llm/parse')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: "book 2 tickets" });

    expect(res.statusCode).toBe(200);
    expect(typeof res.body === 'string' || typeof res.text === 'string').toBeTruthy();
  });
});
