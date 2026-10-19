import { afterEach, describe, expect, it, vi } from 'vitest';

const { answerMessage } = vi.hoisted(() => ({ answerMessage: vi.fn() }));

vi.mock('../src/modules/chatbot/chatbot.service.js', () => ({ answerMessage }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('CineBot controller diagnostics', () => {
  it('passes session and optional authenticated user to the chatbot service', async () => {
    answerMessage.mockResolvedValue({ reply: 'ok', sessionId: 'new-session-id' });
    const req = {
      valid: {
        body: {
          message: 'Phim nào đang chiếu?',
          sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      },
      user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    const { reply } = await import('../src/modules/chatbot/chatbot.controller.js');
    await reply(req, res);

    expect(answerMessage).toHaveBeenCalledWith(req.valid.body.message, {
      sessionId: req.valid.body.sessionId,
      userId: req.user.id,
    });
    expect(res.json).toHaveBeenCalledWith({ reply: 'ok', sessionId: 'new-session-id' });
  });

  it('returns a clear database connection error and request ID', async () => {
    answerMessage.mockRejectedValue(
      Object.assign(new Error('Database server unavailable'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P1001',
      }),
    );
    const req = {
      valid: { body: { message: 'Phim nào đang chiếu?' } },
      id: 'request-123',
      log: { error: vi.fn() },
    };
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    const { reply } = await import('../src/modules/chatbot/chatbot.controller.js');
    await reply(req, res);

    expect(req.log.error).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'P1001',
        message: expect.stringContaining('MySQL is unreachable (Prisma P1001)'),
        requestId: 'request-123',
      },
    });
  });
});
