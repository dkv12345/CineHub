import '../config.js';
import { prisma } from '@cinehub/db';
import { fetchSessions } from '../galaxyClient.js';
import { openRaw, saveRaw } from '../saveRaw.js';
import { mapSession } from '../adapters/galaxyAdapter.js';
import { upsertCinema, upsertAuditorium, upsertMovie, upsertShowtime } from '../upsert/catalog.js';

async function main() {
  const chain = await prisma.cinemaChain.findUniqueOrThrow({ where: { code: 'GALAXY' } });
  let mongoClient = null;
  let rawCol = null;

  try {
    const raw = await openRaw();
    mongoClient = raw.client;
    rawCol = raw.col;
  } catch (err) {
    console.warn('[WARN] MongoDB not reachable, skipping raw archiving:', err.message);
  }

  const startedAt = new Date();

  try {
    console.log('[INFO] Starting Galaxy Cinema crawler job...');
    const sessions = await fetchSessions();
    console.log(`[INFO] Fetched ${sessions.length} sessions from Galaxy API`);

    if (rawCol) {
      await saveRaw(rawCol, 'session', sessions, (s) => s.id);
    }

    const cinemas = new Map();
    const movies = new Map();
    for (const s of sessions) {
      if (s.cinema?.code) cinemas.set(s.cinema.code, s.cinema);
      if (s.movie?.id) movies.set(s.movie.id, s.movie);
    }

    console.log(`[INFO] Upserting ${cinemas.size} cinemas...`);
    const cinemaRows = new Map();
    for (const [code, c] of cinemas) {
      cinemaRows.set(code, await upsertCinema(chain, c));
    }

    console.log(`[INFO] Upserting ${movies.size} movies...`);
    const movieRows = new Map();
    for (const [id, m] of movies) {
      movieRows.set(id, await upsertMovie(chain, m));
    }

    console.log('[INFO] Upserting showtimes and auditoriums...');
    const audCache = new Map();
    let done = 0;
    let skipped = 0;

    for (const s of sessions) {
      try {
        const m = mapSession(s, { durationMin: s.movie?.duration });
        const cinema = cinemaRows.get(m.cinemaCode);
        const movie = movieRows.get(m.movieExternalId);

        if (!cinema || !movie) continue;

        const key = `${m.cinemaCode}|${m.auditoriumName}`;
        if (!audCache.has(key) || m.tier !== 'STANDARD') {
          audCache.set(key, await upsertAuditorium(cinema, m));
        }

        // Thực hiện upsert showtime với try-catch riêng để tránh hỏng toàn bộ job
        await upsertShowtime({ cinema, auditorium: audCache.get(key), movie }, m);
        done++;
      } catch (err) {
        // Bỏ qua lỗi vi phạm trùng lịch chiếu (P2002) và tiếp tục suất chiếu khác
        if (err.code === 'P2002') {
          skipped++;
        } else {
          console.warn(`[WARN] Failed to upsert showtime for session ${s.id}:`, err.message);
        }
      }
    }

    console.log(
      `[SUCCESS] Completed: ${cinemas.size} cinemas, ${movies.size} movies, ${done} showtimes inserted/updated (${skipped} skipped), took ${Date.now() - startedAt.getTime()}ms`,
    );
  } catch (error) {
    console.error('[ERROR] Crawl job failed:', error);
    process.exit(1);
  } finally {
    if (mongoClient) await mongoClient.close();
    await prisma.$disconnect();
  }
}

main();
