const request = require('supertest');
const path = require('path');
const { createTempDb } = require('./utils/dbTestUtils');

describe('Admin Service: /api/admin/events', () => {
  let app;
  let dbPath;

  beforeAll(() => {
    dbPath = createTempDb('admin-test.sqlite');
    process.env.TIGERTIX_DB_PATH = dbPath;
    app = require('../admin-service/server');
  });

  afterAll(() => {
    delete process.env.TIGERTIX_DB_PATH;
  });

  test('creates an event with valid input', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/admin/events')
      .send({ name: 'Hackathon', datetime: future, location: 'Watt Center', capacity: 50 })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ name: 'Hackathon', location: 'Watt Center', capacity: 50 });
    expect(res.body).toHaveProperty('id');
  });

  test('rejects invalid payload with 400', async () => {
    const res = await request(app)
      .post('/api/admin/events')
      .send({ name: 123, datetime: 'not-a-date', location: null, capacity: -1 })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(400);
    expect(typeof res.text === 'string' || typeof res.body?.error === 'string').toBeTruthy();
  });
});
