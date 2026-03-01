// ensure tests use an in-memory database; set before importing modules
process.env.DB_FILE = ':memory:';

// mock stripe so network calls aren't made
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://fake.url' }) } },
    webhooks: { constructEvent: jest.fn((body) => body) },
  }));
});

import { createMocks } from 'node-mocks-http';
import * as db from '../utils/db';
import loginHandler from '../pages/api/login';
import scoreHandler from '../pages/api/score';
import userHandler from '../pages/api/user';
import logoutHandler from '../pages/api/logout';
import checkoutHandler from '../pages/api/checkout';
import webhookHandler from '../pages/api/webhook';

// helper to call API handlers with JSON bodies
async function run(handler: any, method: string, body?: any, cookies?: Record<string,string>) {
  const cookieHeader = cookies
    ? Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
    : '';
  const { req, res } = createMocks({ method, body, headers: { cookie: cookieHeader }, cookies });
  await handler(req, res);
  let data: any = res._getData();
  try { data = JSON.parse(data); } catch {}
  return { status: res._getStatusCode(), data, headers: res._getHeaders() };
}

// run handler with raw string payload and readable stream behavior (for webhook)
async function runRaw(handler: any, method: string, rawBody: string, headers: Record<string,string> = {}, cookies?: Record<string,string>) {
  const { req, res } = createMocks({ method, body: undefined, headers, cookies });
  // patch req to emit data/end events
  req.on = (event: string, cb: (...args: any[]) => void) => {
    if (event === 'data') {
      cb(Buffer.from(rawBody));
    }
    if (event === 'end') {
      cb();
    }
    return req;
  };
  await handler(req as any, res as any);
  let data: any = res._getData();
  try { data = JSON.parse(data); } catch {}
  return { status: res._getStatusCode(), data, headers: res._getHeaders() };
}

describe('API routes', () => {
  beforeEach(() => {
    // wipe and reinitialize the in-memory database
    db.clear();
    db.ensureDefaultUser();
  });

  test('login with correct credentials', async () => {
    const { status, data } = await run(loginHandler, 'POST', { username: 'alice', password: 'password123' });
    expect(status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.username).toBe('alice');
    expect(data.user.id).toBeGreaterThan(0);
  });

  test('login fails with wrong password', async () => {
    const { status } = await run(loginHandler, 'POST', { username: 'alice', password: 'wrong' });
    expect(status).toBe(401);
  });

  test('score endpoints require auth', async () => {
    const { status } = await run(scoreHandler, 'GET');
    expect(status).toBe(401);
  });

  test('score increment and retrieval with valid session', async () => {
    const alice = db.findUser('alice');
    const { createSession } = require('../utils/sessions');
    const token = createSession(alice.id);
    const { status: incStatus, data: incData } = await run(scoreHandler, 'POST', {}, { session: token });
    expect(incStatus).toBe(200);
    expect(incData.score).toBe(1);
    const { data: getData } = await run(scoreHandler, 'GET', null, { session: token });
    expect(getData.score).toBe(1);
  });

  test('checkout creates a stripe session', async () => {
    const alice = db.findUser('alice');
    const { createSession } = require('../utils/sessions');
    const token = createSession(alice.id);
    const { status, data } = await run(checkoutHandler, 'POST', {}, { session: token });
    expect(status).toBe(200);
    expect(data.url).toBe('https://fake.url');
  });

  test('webhook marks user subscribed', async () => {
    jest.setTimeout(10000);
    // ensure user is not subscribed initially
    const alice = db.findUser('alice');
    expect(alice.is_subscribed).toBe(0);
    // send fake event body (no signature check because STRIPE_WEBHOOK_SECRET undefined)
    const event = { type: 'checkout.session.completed', data: { object: { metadata: { userId: alice.id } } } };
    const { status } = await runRaw(webhookHandler, 'POST', JSON.stringify(event));
    expect(status).toBe(200);
    const updated = db.findUser('alice');
    expect(updated.is_subscribed).toBe(1);
  });
});
