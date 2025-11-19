const request = require('supertest');
const { createTempDb } = require('./utils/dbTestUtils');

describe('Authentication + Protected Routes', () => {
  let app;
  let dbPath;

  beforeAll(() => {
    dbPath = createTempDb('auth-test.sqlite');
    process.env.TIGERTIX_DB_PATH = dbPath;
    app = require('../client-service/server');
  });

  afterAll(() => {
    delete process.env.TIGERTIX_DB_PATH;
  });

  // Helper to register + login a user
  const registerAndLogin = async (email = 'test@clemson.edu') => {
    const payload = {
      email,
      password: 'Secret123!',
      firstName: 'Test',
      lastName: 'User'
    };

    // Register
    const reg = await request(app)
      .post('/api/register')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(reg.statusCode).toBe(201);

    // Login
    const loginRes = await request(app)
      .post('/api/login')
      .send({ email, password: payload.password })
      .set('Content-Type', 'application/json');

    expect(loginRes.statusCode).toBe(200);
    expect(typeof loginRes.body.token).toBe('string');

    return loginRes.body.token;
  };

  // -------------------------------------------------------------
  // REGISTER TESTS
  // -------------------------------------------------------------

  test('POST /api/register → successfully creates a new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        email: 'newuser@clemson.edu',
        password: 'Secret123!',
        firstName: 'New',
        lastName: 'User'
      })
      .set('Content-Type', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('userId');
  });

  test('POST /api/register → rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ email: 'nope@clemson.edu' }); // Missing fields

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // -------------------------------------------------------------
  // LOGIN TESTS
  // -------------------------------------------------------------

  test('POST /api/login → returns a JWT on successful login', async () => {
    const token = await registerAndLogin('loginTest@clemson.edu');
    expect(token).toBeTruthy();
  });

  test('POST /api/login → fails with incorrect password', async () => {
    await request(app).post('/api/register').send({
      email: 'wrongpass@clemson.edu',
      password: 'Secret123!',
      firstName: 'A',
      lastName: 'B'
    });

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'wrongpass@clemson.edu', password: 'badPass123' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/login → fails when user does not exist', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'nouser@clemson.edu', password: 'whatever123' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  // -------------------------------------------------------------
  // PROTECTED ROUTE /profile TESTS
  // -------------------------------------------------------------

  test('GET /api/profile → succeeds for authenticated user', async () => {
    const email = 'profileTest@clemson.edu';
    const token = await registerAndLogin(email);

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', email);
  });

  test('GET /api/profile → fails without JWT', async () => {
    const res = await request(app)
      .get('/api/profile')
      .send({ email: 'someone@clemson.edu' });

    expect(res.statusCode).toBe(401);
  });

  test('GET /api/profile → fails when JWT user does not match requested email', async () => {
    const token = await registerAndLogin('correct@clemson.edu');

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'otheruser@clemson.edu' });

    expect(res.statusCode).toBe(403); // Forbidden
  });
  // -------------------------------------------------------------
  // EXPIRED TOKEN TEST
  // -------------------------------------------------------------
  const jwt = require('jsonwebtoken');

  test('GET /api/profile → fails with expired JWT', async () => {
  const email = 'expired@clemson.edu';
  const token = await registerAndLogin(email);

  // create an already expired token
  const expiredToken = jwt.sign(
    { email },
    process.env.JWT_SECRET || 'PLACEHOLDER_JWT_PRIVKEY_101010',
    { expiresIn: '-1s' } // expired 1 second ago
  );

  const res = await request(app)
    .get('/api/profile')
    .set('Authorization', `Bearer ${expiredToken}`)
    .send({ email });

  expect(res.statusCode).toBe(401);
  expect(res.body).toHaveProperty('error');
  expect(res.body.error.toLowerCase()).toContain('invalid authentication');
  });
});
