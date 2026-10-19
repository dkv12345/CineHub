import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/modules/chatbot/chatbot.session.js', () => ({
  loadSession: vi.fn().mockResolvedValue(null),
  createSession: vi.fn().mockResolvedValue(null),
  saveTurn: vi.fn().mockResolvedValue(false),
}));

vi.mock('@cinehub/db', () => ({
  prisma: {
    movie: { findMany: vi.fn().mockResolvedValue([]) },
    genre: { findMany: vi.fn().mockResolvedValue([]) },
    cinema: { findMany: vi.fn().mockResolvedValue([]) },
    showtime: { findMany: vi.fn().mockResolvedValue([]) },
    priceRule: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('CineBot Gemini integration', () => {
  it('uses the API key with a default model and forwards natural-language questions', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('GEMINI_MODEL', '');

    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Gemini trả lời câu hỏi.' }] } }],
      }),
    });
    vi.stubGlobal('fetch', fetch);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const question = 'Bạn có thể giải thích thể loại phim trinh thám là gì không?';
    const result = await answerMessage(question);

    expect(result.reply).toBe('Gemini trả lời câu hỏi.');
    expect(result.responseSource).toBe('gemini');
    expect(fetch).toHaveBeenCalledOnce();

    const [url, request] = fetch.mock.calls[0];
    expect(url).toContain('/models/gemini-3.8-flash:generateContent');
    expect(request.headers['x-goog-api-key']).toBe('test-api-key');
    const prompt = JSON.parse(request.body).contents[0].parts[0].text;
    expect(JSON.parse(prompt).question).toBe(question);
  });

  it('returns an actionable notice when Google rejects the API key', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Bạn có thể giải thích một khái niệm điện ảnh chung không?');

    expect(result.responseSource).toBe('database');
    expect(result.aiNotice).toContain('HTTP 403');
    expect(result.aiNotice).toContain('API key');
  });

  it('discovers a generateContent model when the default model is unavailable', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('GEMINI_MODEL', '');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-enabled-flash',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/embedding-only',
              supportedGenerationMethods: ['embedContent'],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Đây là câu trả lời từ model khả dụng.' }] } }],
        }),
      });
    vi.stubGlobal('fetch', fetch);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Bạn có thể giải thích một khái niệm điện ảnh chung không?');

    expect(result.responseSource).toBe('gemini');
    expect(result.reply).toBe('Đây là câu trả lời từ model khả dụng.');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(fetch.mock.calls[2][0]).toContain('/models/gemini-enabled-flash:generateContent');
  });

  it('distinguishes an inaccessible model-list endpoint from a missing model', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('GEMINI_MODEL', '');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'Model listing is unavailable.' } }),
        }),
    );

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Bạn có thể giải thích một khái niệm điện ảnh chung không?');

    expect(result.aiNotice).toContain('liệt kê Gemini models');
    expect(result.aiNotice).toContain('Model listing is unavailable.');
  });
});
