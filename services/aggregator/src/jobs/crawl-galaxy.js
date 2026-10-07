import { prisma } from '@cinehub/db';
import { fetchSessions } from '../galaxyClient.js';
import { openRaw, saveRaw } from '../saveRaw.js';
import { mapSession } from '../adapters/galaxyAdapter.js';
import { upsertCinema, upsertAuditorium, upsertMovie, upsertShowtime } from '../upsert/catalog.js';

async function main() {
  const chain = await prisma.cinemaChain.findUniqueOrThrow({ where: { code: 'GALAXY' } });
  const { client, col } = await openRaw();
  const startedAt = new Date();

  try {
    console.log('🚀 Starting Galaxy Cinema crawler job...');
    const sessions = await fetchSessions();
    console.log(`📥 Fetched ${sessions.length} sessions from Galaxy API`);

    await saveRaw(col, 'session', sessions, (s) => s.id);

    const cinemas = new Map();
    const movies = new Map();
    for (const s of sessions) {
      if (s.cinema?.code) cinemas.set(s.cinema.code, s.cinema);
      if (s.movie?.id) movies.set(s.movie.id, s.movie);
    }

    console.log(`🏛️ Upserting ${cinemas.size} cinemas...`);
    const cinemaRows = new Map();
    for (const [code, c] of cinemas) {
      cinemaRows.set(code, await upsertCinema(chain, c));
    }

    console.log(`🎬 Upserting ${movies.size} movies...`);
    const movieRows = new Map();
    for (const [id, m] of movies) {
      movieRows.set(id, await upsertMovie(chain, m));
    }

    console.log('🎟️ Upserting showtimes and auditoriums...');
    const audCache = new Map();
    let done = 0;
    for (const s of sessions) {
      const m = mapSession(s, { durationMin: s.movie?.duration });
      const cinema = cinemaRows.get(m.cinemaCode);
      const movie = movieRows.get(m.movieExternalId);

      if (!cinema || !movie) continue;

      const key = `${m.cinemaCode}|${m.auditoriumName}`;
      if (!audCache.has(key) || m.tier !== 'STANDARD') {
        audCache.set(key, await upsertAuditorium(cinema, m));
      }

      await upsertShowtime({ cinema, auditorium: audCache.get(key), movie }, m);
      done++;
    }

    console.log(
      `✨ Completed: ${cinemas.size} cinemas, ${movies.size} movies, ${done} showtimes (${Date.now() - startedAt.getTime()}ms)`,
    );
  } catch (error) {
    console.error('❌ Crawl job failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    await prisma.$disconnect();
  }
}

main();
