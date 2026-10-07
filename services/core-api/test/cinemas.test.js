import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/cinemas', () => {
  it('trả 400 khi pageSize vượt giới hạn', async () => {
    const res = await request(createApp()).get('/api/cinemas?pageSize=1000');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
