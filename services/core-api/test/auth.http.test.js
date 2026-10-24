import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { generateAccessToken } from '../src/lib/jwt.js';

describe('auth HTTP contract', () => {
  const app = createApp();

  it('rejects malformed OTP codes before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: 'an@example.com', code: '12ab56' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects weak registration payloads', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', fullName: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires a bearer token on GET /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('signals TOKEN_EXPIRED so the frontend interceptor can refresh', async () => {
    const expired = generateAccessToken(
      { sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: 'CUSTOMER', email: 'an@example.com' },
      { expiresIn: -10 },
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('requires a refresh token to refresh a session', async () => {
    const res = await request(app).put('/api/auth/refresh-token').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logs out idempotently and clears the refresh cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refreshToken=;/);
  });
});
