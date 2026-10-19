import { afterEach, describe, expect, it, vi } from 'vitest';

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));

vi.mock('jsonwebtoken', () => ({ default: { verify } }));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('optional chatbot authentication', () => {
  it('attaches a verified UUID user and never rejects invalid tokens', async () => {
    const { optionalAuth } = await import('../src/middleware/optionalAuth.js');
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const req = { get: vi.fn().mockReturnValue('Bearer signed-token') };
    const next = vi.fn();

    verify.mockReturnValueOnce({ sub: id });
    optionalAuth(req, {}, next);
    expect(req.user).toEqual({ id });
    expect(next).toHaveBeenCalledOnce();

    req.get.mockReturnValue('Bearer expired-token');
    verify.mockImplementationOnce(() => {
      throw new Error('expired');
    });
    optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(2);
  });
});
