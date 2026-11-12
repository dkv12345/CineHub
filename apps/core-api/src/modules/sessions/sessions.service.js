import { env } from '../../platform/config/env.js';
import { getRedisClient } from '../../platform/cache/redis.js';
import { logger } from '../../platform/observability/logger.js';
import * as sessionsRepository from './sessions.repository.js';

const galaxyBaseUrl = process.env.GALAXY_BASE_URL ?? 'https://www.galaxycine.vn';
const galaxyTimeoutMs = Number(process.env.GALAXY_TIMEOUT_MS) || 8000;
const galaxyClientId = '3da4eba4-94dd-4e74-bc25-38e89a01fe07';
const galaxyUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const cacheKey = 'sessions:galaxy:live:v1';
const cacheTtlMs = env.SHOWTIMES_CACHE_TTL_SECONDS * 1000;
const retryDelayMs = env.SHOWTIMES_UPSTREAM_RETRY_SECONDS * 1000;
let memorySnapshot;
let refreshPromise;
let retryAfter = 0;
let galaxyCookie = '';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

function getSessionStartTime(session) {
  const [year, month, day] = String(session.showDate ?? '')
    .split('-')
    .map(Number);
  const [hour, minute] = String(session.showTime ?? '')
    .split(':')
    .map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error('Invalid session date or time');
  }
  const startTime = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  if (Number.isNaN(startTime.getTime())) throw new Error('Invalid session date or time');
  return startTime;
}

async function fetchSessions() {
  if (!galaxyCookie) {
    try {
      const handshake = await fetch(new URL('/api/v2/mobile/cinemas', galaxyBaseUrl), {
        headers: {
          clientid: galaxyClientId,
          platform: 'website',
          'User-Agent': galaxyUserAgent,
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(galaxyTimeoutMs),
      });
      galaxyCookie = handshake.headers.get('set-cookie')?.split(';')[0] ?? '';
    } catch (error) {
      logger.warn({ err: error.message }, '[Sessions] Galaxy cookie handshake failed');
    }
  }

  const url = new URL('/api/v2/mobile/sessions2', galaxyBaseUrl);
  url.searchParams.set('includeCinema', 'true');
  url.searchParams.set('includeMovie', 'true');
  const headers = {
    Accept: 'application/json',
    clientid: galaxyClientId,
    platform: 'website',
    'User-Agent': galaxyUserAgent,
  };
  if (galaxyCookie) headers['Cookie'] = galaxyCookie;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(galaxyTimeoutMs),
  });
  if (!response.ok) throw new Error(`Galaxy sessions API returned HTTP ${response.status}`);
  const payload = await response.json();
  const sessions = payload?.data?.result;
  if (!Array.isArray(sessions)) throw new Error('Galaxy sessions API returned an invalid response');
  return sessions;
}

function timeout(promise, delayMs) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Redis request timed out')), delayMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function readCache() {
  let cached = memorySnapshot;
  try {
    const raw = await timeout(getRedisClient().get(cacheKey), 750);
    if (raw) {
      const redisSnapshot = JSON.parse(raw);
      if (!cached || Date.parse(redisSnapshot.fetchedAt) > Date.parse(cached.fetchedAt)) {
        cached = redisSnapshot;
      }
    }
  } catch (error) {
    logger.warn({ err: error.message }, '[Sessions] Redis cache read failed');
  }
  if (cached) memorySnapshot = cached;
  return cached;
}

async function writeCache(snapshot) {
  memorySnapshot = snapshot;
  try {
    await timeout(
      getRedisClient().set(
        cacheKey,
        JSON.stringify(snapshot),
        'EX',
        Math.max(86400, env.SHOWTIMES_CACHE_TTL_SECONDS * 2),
      ),
      750,
    );
  } catch (error) {
    logger.warn({ err: error.message }, '[Sessions] Redis cache write failed');
  }
}

function toLiveSession(session, index, references) {
  const caption = String(session.caption ?? '').toLowerCase();
  return {
    id: session.id,
    showDate: session.showDate,
    showTime: session.showTime,
    screenName: session.screenName || '',
    totalSeat: Number(session.totalSeat) || 0,
    bookedSeat: Number(session.bookedSeat) || 0,
    caption: caption.includes('voice') || caption.includes('lồng') ? 'voice' : 'sub',
    version: session.version || '',
    movieFormat: session.movieFormat || '',
    status: session.status,
    movie: {
      id: session.movie?.id || session.movieId || '',
      dbId: references.movieIds.get(session.movie?.id || session.movieId || '') || '',
      name: session.movie?.name || '',
      age: String(session.movie?.age || '').replace('T', ''),
      duration: Number(session.movie?.duration) || 0,
      startDate: session.movie?.startDate || '',
      endDate: session.movie?.endDate || '',
      createdAt: session.movie?.createdAt || '',
      imageLandscape: session.movie?.imageLandscape || '',
      imagePortrait: session.movie?.imagePortrait || '',
      slug: session.movie?.slug || '',
      trailer: session.movie?.trailer || '',
      rate: Number(session.movie?.rate) || 0,
      totalVotes: Number(session.movie?.totalVotes) || 0,
      views: Number(session.movie?.views) || 0,
      order: index,
    },
    cinema: {
      id: session.cinema?.code || session.cinemaCode || '',
      dbId: references.cinemaIds.get(session.cinema?.code || session.cinemaCode || '') || '',
      code: session.cinema?.code || session.cinemaCode || '',
      name: session.cinema?.name || '',
      latitude: String(session.cinema?.latitude || ''),
      longitude: String(session.cinema?.longitude || ''),
      address: session.cinema?.address || '',
      phone: session.cinema?.phone || '',
      cityId: session.cinema?.cityCode || '',
      cityCode: session.cinema?.cityCode || '',
      cityName: session.cinema?.cityName || '',
      imageLandscape: session.cinema?.imageLandscape || '',
      imagePortrait: session.cinema?.imagePortrait || '',
      imageUrls: session.cinema?.imageUrls || [],
      order: Number(session.cinema?.order) || 0,
    },
  };
}

async function refreshLiveSnapshot() {
  const now = new Date();
  const sessions = await fetchSessions();
  let references = { cinemaIds: new Map(), movieIds: new Map() };
  try {
    references = await sessionsRepository.findLiveSessionReferences(sessions);
  } catch (error) {
    logger.warn({ err: error.message }, '[Sessions] Could not resolve live session database IDs');
  }
  const data = sessions
    .map((session, index) => {
      try {
        const status = String(session.status || '').toUpperCase();
        const statusIsActive = !status || ['SCHEDULED', 'OPEN', 'SOLD_OUT'].includes(status);
        return statusIsActive && getSessionStartTime(session) >= now
          ? toLiveSession(session, index, references)
          : null;
      } catch (error) {
        logger.warn(
          { err: error.message, sessionId: session.id },
          '[Sessions] Skipping invalid upstream session',
        );
        return null;
      }
    })
    .filter(Boolean);

  const snapshot = { data, fetchedAt: new Date().toISOString(), stale: false, source: 'galaxy' };
  await writeCache(snapshot);
  void sessionsRepository
    .syncLiveShowtimes(sessions, references)
    .then(({ saved, skipped, failed }) => {
      logger.info({ saved, skipped, failed }, '[Sessions] Live showtimes database sync completed');
      if (failed > 0)
        logger.warn({ failed }, '[Sessions] Some live showtimes could not be synchronized');
    })
    .catch((error) => {
      logger.error({ err: error.message }, '[Sessions] Live showtimes database sync failed');
    });
  return snapshot;
}

async function getLiveSnapshot() {
  const cached = await readCache();
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < cacheTtlMs) return cached;
  if (refreshPromise) return refreshPromise;
  if (Date.now() < retryAfter) {
    if (cached) return { ...cached, stale: true };
    return null;
  }

  refreshPromise = refreshLiveSnapshot()
    .then((snapshot) => {
      retryAfter = Date.now() + cacheTtlMs;
      return snapshot;
    })
    .catch((error) => {
      retryAfter = Date.now() + retryDelayMs;
      logger.warn({ err: error.message }, '[Sessions] Live showtimes refresh failed');
      return cached ? { ...cached, stale: true } : null;
    })
    .finally(() => {
      refreshPromise = undefined;
    });
  return refreshPromise;
}

function filterSessions(data, query) {
  const movieQuery = normalize(query.movie ?? query.movieId ?? '');
  const cinemaQuery = normalize(query.cinema ?? query.cinemaId ?? '');
  const dateQuery = query.date ?? '';

  return data.filter((session) => {
    const movieMatches =
      !movieQuery ||
      [session.movie.id, session.movie.dbId, session.movie.slug, session.movie.name].some(
        (value) => normalize(value) === movieQuery,
      );
    const cinemaMatches =
      !cinemaQuery ||
      [session.cinema.id, session.cinema.dbId, session.cinema.code, session.cinema.name].some(
        (value) => normalize(value) === cinemaQuery,
      );
    return movieMatches && cinemaMatches && (!dateQuery || session.showDate === dateQuery);
  });
}

function fromDatabase(showtimes) {
  const now = Date.now();
  return showtimes
    .filter((showtime) => showtime.startTime.getTime() >= now)
    .map((s, idx) => {
      const showDate = s.localDate
        ? s.localDate.toISOString().slice(0, 10)
        : s.startTime.toISOString().slice(0, 10);
      const hours = String((s.startTime.getUTCHours() + 7) % 24).padStart(2, '0');
      const minutes = String(s.startTime.getUTCMinutes()).padStart(2, '0');
      const movieExtId = s.movie.sources?.[0]?.externalId || s.movie.id;

      return {
        id: s.externalId || s.id,
        showDate,
        showTime: `${hours}:${minutes}`,
        screenName: s.auditorium?.name || '',
        totalSeat: s.providerTotalSeats || 0,
        bookedSeat: s.providerBookedSeats || 0,
        caption: s.captionMode === 'DUBBED' ? 'voice' : 'sub',
        version: s.versionCode || '2d',
        movieFormat: s.formatRaw || '2D Phụ Đề',
        status: s.status,
        movie: {
          id: movieExtId,
          dbId: s.movie.id,
          name: s.movie.title,
          age: (s.movie.ageRating || '').replace('T', ''),
          duration: s.movie.durationMin || 0,
          startDate: s.movie.releaseDate
            ? `${s.movie.releaseDate.toISOString().slice(0, 10)} 00:00:00`
            : '',
          endDate: s.movie.endDate ? `${s.movie.endDate.toISOString().slice(0, 10)} 00:00:00` : '',
          createdAt: s.movie.createdAt ? s.movie.createdAt.toISOString() : '',
          imageLandscape: s.movie.backdropUrl || s.movie.posterUrl,
          imagePortrait: s.movie.posterUrl,
          slug: s.movie.slug,
          trailer: s.movie.trailerUrl || '',
          rate: Number(s.movie.ratingAvg) || 0,
          totalVotes: s.movie.ratingCount || 0,
          views: 0,
          order: idx,
        },
        cinema: {
          id: s.cinema.externalId || s.cinema.id,
          dbId: s.cinema.id,
          code: s.cinema.externalId || '',
          name: s.cinema.name,
          latitude: String(s.cinema.latitude || ''),
          longitude: String(s.cinema.longitude || ''),
          address: s.cinema.address,
          phone: s.cinema.phone || '',
          cityId: s.cinema.sourceCityId || '',
          imageLandscape: s.cinema.imageUrl || '',
          imagePortrait: s.cinema.thumbnailUrl || '',
          imageUrls: s.cinema.galleryUrls || [],
          order: s.cinema.sortOrder || 0,
        },
      };
    });
}

export async function listSessions(query = {}) {
  let snapshot = await getLiveSnapshot();
  if (!snapshot) {
    const showtimes = await sessionsRepository.findRecentAndUpcomingShowtimes(new Date());
    snapshot = {
      data: fromDatabase(showtimes),
      fetchedAt: new Date().toISOString(),
      stale: true,
      source: 'database',
    };
  }

  const result = filterSessions(snapshot.data, query);
  return {
    response: {
      status: 200,
      code: 0,
      message: 'OK',
      url: '/api/sessions',
    },
    data: result,
    total: result.length,
    result,
    fetchedAt: snapshot.fetchedAt,
    stale: snapshot.stale,
    source: snapshot.source,
  };
}
