import { randomUUID } from 'node:crypto';
import { logger } from '../../platform/observability/logger.js';
import { getMongoCollection } from './chatbot.vector.js';

const COLLECTION = 'ai_chat_sessions';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 1000;

let indexesPromise;

async function getSessionsCollection() {
  return getMongoCollection(COLLECTION);
}

export async function ensureIndexes() {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const collection = await getSessionsCollection();
      if (!collection) return false;

      const indexes = [
        [{ sessionId: 1 }, { unique: true, name: 'session_id_unique' }],
        [{ userId: 1, updatedAt: -1 }, { name: 'user_updated_at' }],
        [{ updatedAt: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS, name: 'session_ttl' }],
      ];
      let succeeded = true;
      for (const [keys, options] of indexes) {
        try {
          await collection.createIndex(keys, options);
        } catch (error) {
          succeeded = false;
          logger.warn(
            { errorName: error?.name, errorCode: error?.code },
            'CineBot: không tạo được index của ai_chat_sessions.',
          );
        }
      }
      return succeeded;
    })().catch((error) => {
      logger.warn(
        { errorName: error?.name, errorCode: error?.code },
        'CineBot: không thể khởi tạo index của ai_chat_sessions.',
      );
      return false;
    });
  }
  const initialized = await indexesPromise;
  if (!initialized) indexesPromise = null;
  return initialized;
}

function safeText(text) {
  return String(text ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[redacted]')
    .replace(/\bAQ\.[0-9A-Za-z_-]{20,}\b/g, '[redacted]')
    .replace(/(?:\+?84|0)(?:[\s().-]*\d){8,10}\b/g, '[phone]')
    .slice(0, MAX_TEXT_LENGTH);
}

function movieReferences(movies) {
  return (Array.isArray(movies) ? movies : [])
    .filter((movie) => typeof movie?.id === 'string' && typeof movie?.title === 'string')
    .slice(0, 6)
    .map(({ id, title }) => ({ id, title: safeText(title) }));
}

export function initialConversationContext() {
  return {
    currentIntent: null,
    movie: {
      movieId: null,
      title: null,
      ageRating: null,
      posterUrl: null,
      status: null,
    },
    audience: {
      type: null,
      age: null,
      allowedAgeRatings: null,
      excludedAgeRatings: null,
    },
    filters: {
      genre: null,
      releaseStatus: null,
      screeningFormat: null,
    },
    cinema: {
      cinemaId: null,
      name: null,
    },
    date: null,
    timeWindow: {
      partOfDay: null,
      periodLabel: null,
      startHour: null,
      endHour: null,
    },
    showtime: {
      showtimeId: null,
      time: null,
    },
    lastAction: null,
  };
}

export function mergeConversationContext(currentContext = {}, updates = {}) {
  const base = { ...initialConversationContext(), ...currentContext };
  const merged = { ...base };

  if (updates.resetMovie) {
    merged.movie = { movieId: null, title: null, ageRating: null, posterUrl: null, status: null };
  } else if (updates.movie) {
    merged.movie = {
      movieId: updates.movie.movieId ?? updates.movie.id ?? base.movie.movieId,
      title: updates.movie.title ?? base.movie.title,
      ageRating: updates.movie.ageRating ?? base.movie.ageRating,
      posterUrl: updates.movie.posterUrl ?? base.movie.posterUrl,
      status: updates.movie.status ?? base.movie.status,
    };
  }

  if (updates.audience) {
    merged.audience = { ...base.audience, ...updates.audience };
  }

  if (updates.cinema) {
    merged.cinema = {
      cinemaId: updates.cinema.cinemaId ?? updates.cinema.id ?? base.cinema.cinemaId,
      name: updates.cinema.name ?? base.cinema.name,
    };
  }

  if (updates.date !== undefined) {
    merged.date = updates.date;
  }

  if (updates.timeWindow) {
    merged.timeWindow = { ...base.timeWindow, ...updates.timeWindow };
  }

  if (updates.filters) {
    merged.filters = { ...base.filters, ...updates.filters };
  }

  if (updates.showtime) {
    merged.showtime = { ...base.showtime, ...updates.showtime };
  }

  if (updates.currentIntent) {
    merged.currentIntent = updates.currentIntent;
  }

  if (updates.lastAction) {
    merged.lastAction = updates.lastAction;
  }

  return merged;
}

export async function loadSession({ sessionId, userId }) {
  if (typeof sessionId !== 'string' || !sessionId) return null;
  try {
    await ensureIndexes();
    const collection = await getSessionsCollection();
    if (!collection) return null;
    const doc = await collection.findOne({
      sessionId,
      userId: userId ?? null,
      updatedAt: { $gt: new Date(Date.now() - SESSION_TTL_MS) },
    });
    if (!doc) return null;
    return {
      ...doc,
      context: mergeConversationContext(doc.context),
    };
  } catch (error) {
    logger.warn(
      { errorName: error?.name, errorCode: error?.code },
      'CineBot: không thể đọc phiên hội thoại; tiếp tục không có bộ nhớ.',
    );
    return null;
  }
}

export async function createSession({ userId }) {
  try {
    await ensureIndexes();
    const collection = await getSessionsCollection();
    if (!collection) return null;

    const now = new Date();
    const session = {
      sessionId: randomUUID(),
      userId: userId ?? null,
      messages: [],
      lastMovies: [],
      context: initialConversationContext(),
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(session);
    return session;
  } catch (error) {
    logger.warn(
      { errorName: error?.name, errorCode: error?.code },
      'CineBot: không thể tạo phiên hội thoại; tiếp tục không có bộ nhớ.',
    );
    return null;
  }
}

export async function saveTurn({ session, userId, message, result, memory, contextUpdates }) {
  if (!session?.sessionId) return false;
  try {
    const collection = await getSessionsCollection();
    if (!collection) return false;

    const at = new Date();
    const messages = [
      { role: 'user', text: safeText(message), at },
      {
        role: 'bot',
        text: safeText(result.reply),
        ...(typeof result.intent === 'string' ? { intent: result.intent } : {}),
        at,
      },
    ];
    // memory = null nghĩa là giữ nguyên những gì đã nhớ
    const lastMovies = memory ? movieReferences(memory.lastMovies) : session.lastMovies || [];
    const lastFilters = memory ? (memory.lastFilters ?? null) : (session.lastFilters ?? null);
    const updatedContext = mergeConversationContext(
      session.context,
      contextUpdates || memory?.context,
    );

    const update = await collection.updateOne(
      { sessionId: session.sessionId, userId: userId ?? null },
      {
        $push: { messages: { $each: messages, $slice: -MAX_MESSAGES } },
        $set: { lastMovies, lastFilters, context: updatedContext, updatedAt: at },
      },
    );
    return update.matchedCount === 1;
  } catch (error) {
    logger.warn(
      { errorName: error?.name, errorCode: error?.code },
      'CineBot: không thể lưu lượt hội thoại; tiếp tục không có bộ nhớ.',
    );
    return false;
  }
}
