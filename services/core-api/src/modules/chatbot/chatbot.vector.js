import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { plainText } from './chatbot.nlp.js';

const COLLECTION = 'movie_embeddings';
const CACHE_TTL_MS = 10 * 60 * 1000;
const MONGO_RETRY_MS = 60 * 1000;

export const EMBEDDING_MODEL = env.GEMINI_EMBEDDING_MODEL.trim() || 'gemini-embedding-001';
export const EMBEDDING_DIMS = env.GEMINI_EMBEDDING_DIMS;

export class EmbeddingError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'EmbeddingError';
    this.status = status;
  }
}

let client = null;
let connectionPromise = null;
let mongoDownUntil = 0;
let cache = { docs: null, loadedAt: 0 };

const mongoUri = () => env.MONGODB_URI.trim();
const modelName = EMBEDDING_MODEL.replace(/^models\//, '');

function l2Normalize(values) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) {
    throw new EmbeddingError('Gemini embedding không hợp lệ');
  }
  return values.map((value) => value / norm);
}

export async function embedText(text, taskType) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new EmbeddingError('Thiếu GEMINI_API_KEY');
  if (!text.trim()) throw new EmbeddingError('Nội dung embedding không được để trống');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:embedContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        model: `models/${modelName}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMS,
      }),
    },
  );

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json()).error?.message ?? '';
    } catch {
      detail = '';
    }
    throw new EmbeddingError(
      `Gemini embedding HTTP ${response.status}: ${detail.replaceAll(apiKey, '[redacted]').slice(0, 200)}`,
      response.status,
    );
  }

  const values = (await response.json()).embedding?.values;
  if (
    !Array.isArray(values) ||
    values.length !== EMBEDDING_DIMS ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new EmbeddingError(`Gemini embedding không đúng số chiều mong đợi (${EMBEDDING_DIMS})`);
  }
  return l2Normalize(values);
}

export async function getMongoCollection(name, { required = false } = {}) {
  const uri = mongoUri();
  if (!uri) {
    if (required) throw new Error('MONGODB_URI is required to store movie embeddings.');
    return null;
  }
  if (Date.now() < mongoDownUntil) {
    if (required) throw new Error('MongoDB is temporarily unavailable after a failed connection.');
    return null;
  }
  try {
    if (!client) {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      connectionPromise = client.connect();
    }
    if (connectionPromise) {
      await connectionPromise;
      connectionPromise = null;
    }
    return client.db(env.MONGODB_DB).collection(name);
  } catch (error) {
    logger.warn(
      { errorName: error?.name, errorCode: error?.code, errorCodeName: error?.codeName },
      'CineBot: không kết nối được MongoDB; dùng trả lời không-semantic.',
    );
    const failedClient = client;
    client = null;
    connectionPromise = null;
    mongoDownUntil = Date.now() + MONGO_RETRY_MS;
    if (failedClient) {
      try {
        await failedClient.close();
      } catch (closeError) {
        logger.warn({ errorName: closeError?.name }, 'CineBot: lỗi đóng kết nối MongoDB.');
      }
    }
    if (required) {
      if (error?.code === 18 || error?.codeName === 'AuthenticationFailed') {
        throw new Error(
          'MongoDB authentication failed (code 18). The credentials in MONGODB_URI do not match the user in the existing data volume. MONGO_INITDB_ROOT_USERNAME/PASSWORD only create the root user when MongoDB initializes an empty volume; align the URI and Compose credentials with the existing user. No data was changed.',
          { cause: error },
        );
      }
      throw new Error(
        `MongoDB connection failed (${error?.codeName || error?.name || 'unknown error'}). Check that MongoDB is running and MONGODB_URI points to the correct instance.`,
        { cause: error },
      );
    }
    return null;
  }
}

export async function getCollection(options) {
  return getMongoCollection(COLLECTION, options);
}

export async function closeMongo() {
  const activeClient = client;
  client = null;
  connectionPromise = null;
  cache = { docs: null, loadedAt: 0 };
  if (activeClient) await activeClient.close();
}

async function loadDocs() {
  if (cache.loadedAt && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.docs;
  }
  const collection = await getCollection();
  if (!collection) return null;

  const docs = await collection
    .find(
      { model: EMBEDDING_MODEL, dims: EMBEDDING_DIMS },
      { projection: { movieId: 1, title: 1, titleNormalized: 1, embedding: 1 } },
    )
    .toArray();
  cache = { docs, loadedAt: Date.now() };
  if (docs.length === 0) {
    logger.warn(
      'CineBot: chưa có embedding trong MongoDB; chạy npm run embed:movies -w @cinehub/core-api.',
    );
    return null;
  }
  return docs;
}

function findSimilarTarget(message, docs) {
  const padded = ` ${plainText(message)} `;
  if (!/\b(giong|tuong tu|kieu nhu)\b/.test(padded)) return null;
  let best = null;
  let bestLength = 0;
  for (const doc of docs) {
    const title = plainText(doc.titleNormalized || doc.title);
    if (title.length > bestLength && padded.includes(` ${title} `)) {
      best = doc;
      bestLength = title.length;
    }
  }
  return best;
}

function dotProduct(left, right) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== EMBEDDING_DIMS ||
    right.length !== EMBEDDING_DIMS
  ) {
    return null;
  }
  let sum = 0;
  for (let index = 0; index < left.length; index++) {
    if (!Number.isFinite(left[index]) || !Number.isFinite(right[index])) return null;
    sum += left[index] * right[index];
  }
  return sum;
}

export async function semanticSearch(message, { limit = 12 } = {}) {
  if (!env.GEMINI_API_KEY?.trim() || !mongoUri()) return null;
  try {
    const docs = await loadDocs();
    if (!docs?.length) return null;

    const target = findSimilarTarget(message, docs);
    const queryVector = target?.embedding || (await embedText(message, 'RETRIEVAL_QUERY'));
    if (!Array.isArray(queryVector) || queryVector.length !== EMBEDDING_DIMS) return null;

    return docs
      .filter((doc) => doc.movieId !== target?.movieId)
      .map((doc) => ({
        movieId: doc.movieId,
        score: dotProduct(queryVector, doc.embedding),
      }))
      .filter((hit) => Number.isFinite(hit.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    logger.warn(
      { errorName: error?.name, status: error?.status },
      'CineBot: tìm kiếm ngữ nghĩa thất bại; dùng cách tra cứu thường.',
    );
    return null;
  }
}
