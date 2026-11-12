import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/bootstrap/app.js';

describe('GET /api/cinemas', () => {
  it('trả 400 khi pageSize vượt giới hạn', async () => {
    const res = await request(createApp()).get('/api/cinemas?pageSize=1000');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('echoes incoming X-Request-Id header and serves /api/v1/booking/status', async () => {
    const res = await request(createApp())
      .get('/api/v1/booking/status')
      .set('X-Request-Id', 'req-test-123');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('req-test-123');
    expect(res.body).toMatchObject({ module: 'booking', status: 'active' });
  });
});
