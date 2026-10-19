import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue('index'),
  findOne: vi.fn(),
  insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
  updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
  getMongoCollection: vi.fn(),
  collection: null,
}));

vi.mock('../src/modules/chatbot/chatbot.vector.js', () => ({
  getMongoCollection: state.getMongoCollection,
}));

function setupCollection() {
  state.collection = {
    createIndex: state.createIndex,
    findOne: state.findOne,
    insertOne: state.insertOne,
    updateOne: state.updateOne,
  };
  state.getMongoCollection.mockResolvedValue(state.collection);
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  state.createIndex.mockResolvedValue('index');
  state.insertOne.mockResolvedValue({ acknowledged: true });
  state.updateOne.mockResolvedValue({ matchedCount: 1 });
  state.getMongoCollection.mockResolvedValue(state.collection);
});

describe('CineBot session memory', () => {
  it('creates separate unique, user/update, and 30-day TTL indexes once', async () => {
    setupCollection();
    const { ensureIndexes } = await import('../src/modules/chatbot/chatbot.session.js');

    await expect(ensureIndexes()).resolves.toBe(true);
    await expect(ensureIndexes()).resolves.toBe(true);

    expect(state.createIndex).toHaveBeenCalledTimes(3);
    expect(state.createIndex).toHaveBeenCalledWith(
      { sessionId: 1 },
      { unique: true, name: 'session_id_unique' },
    );
    expect(state.createIndex).toHaveBeenCalledWith(
      { userId: 1, updatedAt: -1 },
      { name: 'user_updated_at' },
    );
    expect(state.createIndex).toHaveBeenCalledWith(
      { updatedAt: 1 },
      { expireAfterSeconds: 2592000, name: 'session_ttl' },
    );
  });

  it('loads only sessions owned by the requesting guest or authenticated user', async () => {
    setupCollection();
    state.findOne.mockResolvedValue({
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      messages: [],
      lastMovies: [],
    });
    const { loadSession } = await import('../src/modules/chatbot/chatbot.session.js');

    await expect(
      loadSession({
        sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    ).resolves.toMatchObject({ userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
    expect(state.findOne).toHaveBeenLastCalledWith({
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      updatedAt: { $gt: expect.any(Date) },
    });
    state.findOne.mockResolvedValue(null);
    await expect(
      loadSession({
        sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: null,
      }),
    ).resolves.toBeNull();
  });

  it('creates a server-generated session without storing user personal data', async () => {
    setupCollection();
    const { createSession } = await import('../src/modules/chatbot/chatbot.session.js');
    const session = await createSession({ userId: null });

    expect(session.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(session).toMatchObject({ userId: null, messages: [], lastMovies: [] });
    expect(state.insertOne).toHaveBeenCalledWith(session);
  });

  it('returns no session when MongoDB is unavailable', async () => {
    state.getMongoCollection.mockResolvedValue(null);
    const { createSession, loadSession, saveTurn } =
      await import('../src/modules/chatbot/chatbot.session.js');

    await expect(createSession({ userId: null })).resolves.toBeNull();
    await expect(
      loadSession({ sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: null }),
    ).resolves.toBeNull();
    await expect(
      saveTurn({
        session: { sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        userId: null,
        message: 'hello',
        result: { reply: 'hi', intent: 'GREETING' },
      }),
    ).resolves.toBe(false);

    setupCollection();
    await expect(createSession({ userId: null })).resolves.toMatchObject({
      userId: null,
      messages: [],
      lastMovies: [],
    });
    expect(state.createIndex).toHaveBeenCalledTimes(3);
  });

  it('stores a bounded turn, redacts contact details, and remembers at most six movies', async () => {
    setupCollection();
    const { saveTurn } = await import('../src/modules/chatbot/chatbot.session.js');
    const movies = Array.from({ length: 8 }, (_, index) => ({
      id: `movie-${index}`,
      title: `Movie ${index}`,
    }));

    await expect(
      saveTurn({
        session: {
          sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          lastMovies: [],
        },
        userId: null,
        message: 'Email cine@example.com, phone 0912345678, key AIza123456789012345678901234567890',
        result: { reply: 'recommendation', intent: 'RECOMMEND', movies },
      }),
    ).resolves.toBe(true);

    const [filter, update] = state.updateOne.mock.calls[0];
    expect(filter).toEqual({
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: null,
    });
    expect(update.$push.messages.$each).toHaveLength(2);
    expect(update.$push.messages.$each[0].text).not.toContain('cine@example.com');
    expect(update.$push.messages.$each[0].text).not.toContain('0912345678');
    expect(update.$push.messages.$each[0].text).not.toContain('AIza');
    expect(update.$push.messages.$slice).toBe(-20);
    expect(update.$set.lastMovies).toEqual(movies.slice(0, 6));
  });
});
