import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  docs: [],
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  find: vi.fn(),
  toArray: vi.fn(),
  db: vi.fn(),
  collection: vi.fn(),
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: state.connect,
    close: state.close,
    db: (...args) => {
      state.db(...args);
      return {
        collection: (...collectionArgs) => {
          state.collection(...collectionArgs);
          return {
            find: (...findArgs) => {
              state.find(...findArgs);
              return { toArray: state.toArray };
            },
          };
        },
      };
    },
  })),
}));

let closeMongo;

afterEach(async () => {
  await closeMongo?.();
  closeMongo = undefined;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
  state.docs = [];
  state.connect.mockResolvedValue(undefined);
  state.toArray.mockImplementation(async () => state.docs);
});

async function importVectorModule() {
  const vector = await import('../src/modules/chatbot/chatbot.vector.js');
  closeMongo = vector.closeMongo;
  return vector;
}

describe('CineBot vector search', () => {
  it('gets collections by name through the shared Mongo connection', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    vi.stubEnv('MONGODB_DB', 'cinehub-test');
    const { getMongoCollection } = await importVectorModule();

    await expect(getMongoCollection('ai_chat_sessions')).resolves.toBeDefined();
    expect(state.db).toHaveBeenCalledWith('cinehub-test');
    expect(state.collection).toHaveBeenCalledWith('ai_chat_sessions');
  });

  it('embeds a query with the Gemini retrieval task and normalizes its vector', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001');
    vi.stubEnv('GEMINI_EMBEDDING_DIMS', '3');
    vi.stubEnv('GEMINI_TIMEOUT_MS', '20000');
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [3, 4, 0] } }),
    });
    vi.stubGlobal('fetch', fetch);

    const { embedText } = await importVectorModule();
    const vector = await embedText('phim tình cảm', 'RETRIEVAL_QUERY');
    const [, request] = fetch.mock.calls[0];
    const body = JSON.parse(request.body);

    expect(vector).toEqual([0.6, 0.8, 0]);
    expect(body.taskType).toBe('RETRIEVAL_QUERY');
    expect(body.outputDimensionality).toBe(3);
    expect(request.headers['x-goog-api-key']).toBe('test-api-key');
  });

  it('uses a known movie vector for “similar to” queries and ranks other films', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001');
    vi.stubEnv('GEMINI_EMBEDDING_DIMS', '3');
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    vi.stubEnv('MONGODB_DB', 'cinehub-test');
    state.docs = [
      {
        movieId: 'inception-id',
        title: 'Inception',
        titleNormalized: 'inception',
        embedding: [1, 0, 0],
      },
      {
        movieId: 'interstellar-id',
        title: 'Interstellar',
        titleNormalized: 'interstellar',
        embedding: [0.8, 0.6, 0],
      },
      {
        movieId: 'comedy-id',
        title: 'Comedy Film',
        titleNormalized: 'comedy film',
        embedding: [0, 1, 0],
      },
    ];
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const { semanticSearch, EMBEDDING_MODEL, EMBEDDING_DIMS } = await importVectorModule();
    const results = await semanticSearch('phim giống Inception');

    expect(EMBEDDING_MODEL).toBe('gemini-embedding-001');
    expect(EMBEDDING_DIMS).toBe(3);
    expect(results).toEqual([
      { movieId: 'interstellar-id', score: 0.8 },
      { movieId: 'comedy-id', score: 0 },
    ]);
    expect(fetch).not.toHaveBeenCalled();
    expect(state.find).toHaveBeenCalledWith(
      { model: EMBEDDING_MODEL, dims: EMBEDDING_DIMS },
      expect.any(Object),
    );
  });

  it('returns null and falls back when MongoDB is unavailable', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    state.connect.mockRejectedValue(new Error('connection failed'));

    const { semanticSearch } = await importVectorModule();
    await expect(semanticSearch('phim nhẹ nhàng cho gia đình')).resolves.toBeNull();
  });

  it('reports MongoDB authentication failures when the embed script requires a connection', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    const authError = Object.assign(new Error('Authentication failed.'), {
      code: 18,
      codeName: 'AuthenticationFailed',
    });
    state.connect.mockRejectedValue(authError);

    const { getCollection } = await importVectorModule();
    await expect(getCollection({ required: true })).rejects.toThrow(
      'MONGO_INITDB_ROOT_USERNAME/PASSWORD only create the root user when MongoDB initializes an empty volume',
    );
  });
});
