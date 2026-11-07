import { createHash } from 'node:crypto';
import { prisma } from '@cinehub/db';

export async function findRecentAndUpcomingShowtimes(since) {
  return prisma.showtime.findMany({
    where: {
      startTime: { gte: since },
      status: { in: ['SCHEDULED', 'OPEN', 'SOLD_OUT'] },
    },
    include: {
      movie: {
        include: {
          sources: true,
        },
      },
      cinema: true,
      auditorium: true,
    },
    orderBy: [{ startTime: 'asc' }],
    take: 6000,
  });
}

export async function findLiveSessionReferences(sessions) {
  const cinemaCodes = [
    ...new Set(
      sessions.map((session) => session.cinema?.code || session.cinemaCode).filter(Boolean),
    ),
  ];
  const movieExternalIds = [
    ...new Set(sessions.map((session) => session.movie?.id || session.movieId).filter(Boolean)),
  ];
  const [cinemas, movieSources] = await Promise.all([
    prisma.cinema.findMany({
      where: { externalId: { in: cinemaCodes }, chain: { code: 'GALAXY' } },
      select: { id: true, externalId: true },
    }),
    prisma.movieSource.findMany({
      where: { externalId: { in: movieExternalIds }, chain: { code: 'GALAXY' } },
      select: { externalId: true, movieId: true },
    }),
  ]);
  return {
    cinemaIds: new Map(cinemas.map((cinema) => [cinema.externalId, cinema.id])),
    movieIds: new Map(movieSources.map((source) => [source.externalId, source.movieId])),
  };
}

function mapLiveSession(session) {
  const version = String(session.version || '').toLowerCase();
  const formatRaw = session.movieFormat || '';
  let format = 'TWO_D';
  let tier = 'STANDARD';
  let kind = 'REGULAR';

  if (version.includes('imax')) {
    format = 'IMAX';
    tier = 'PREMIUM';
  } else if (version.includes('3d')) {
    format = 'THREE_D';
  } else if (version.includes('4dx')) {
    format = 'FOUR_DX';
  } else if (version.includes('screenx')) {
    format = 'SCREENX';
  } else if (version.includes('dolby')) {
    format = 'DOLBY';
  } else if (version.includes('led')) {
    format = 'LED';
  }

  if (/laurus|aqualis|lagom|vip/i.test(version)) tier = 'VIP';
  if (/rebroadcast|encore/i.test(version)) kind = 'ENCORE';
  else if (version.includes('live')) kind = 'LIVE';

  const [year, month, day] = session.showDate.split('-').map(Number);
  const [hour, minute] = session.showTime.split(':').map(Number);
  const startTime = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  const durationMin = Number(session.movie?.duration) || 120;
  const endTime = new Date(startTime.getTime() + (durationMin + 15) * 60_000);
  const cinemaCode = session.cinema?.code || session.cinemaCode;
  const movieExternalId = session.movie?.id || session.movieId;
  const dedupKey = createHash('sha1')
    .update(`GALAXY:${cinemaCode}:${movieExternalId}:${startTime.toISOString()}:${format}`)
    .digest('hex');
  const captionMode = /voice|lồng/i.test(session.caption || '') ? 'DUBBED' : 'SUBTITLED';

  return {
    cinemaCode,
    movieExternalId,
    auditoriumName: session.screenName || 'Screen 1',
    externalId: session.id,
    dedupKey,
    startTime,
    endTime,
    localDate: new Date(`${session.showDate}T00:00:00.000Z`),
    format,
    formatRaw,
    versionCode: session.version || null,
    tier,
    kind,
    captionMode,
    audioLanguage: 'vi',
    subtitleLanguage: captionMode === 'SUBTITLED' ? 'vi' : null,
    providerTotalSeats: Number(session.totalSeat) || 0,
    providerBookedSeats: Number(session.bookedSeat) || 0,
  };
}

export async function syncLiveShowtimes(sessions, references) {
  const auditoriumPromises = new Map();
  let cursor = 0;
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  const worker = async () => {
    while (cursor < sessions.length) {
      const session = sessions[cursor++];
      try {
        const mapped = mapLiveSession(session);
        const cinemaId = references.cinemaIds.get(mapped.cinemaCode);
        const movieId = references.movieIds.get(mapped.movieExternalId);
        if (!cinemaId || !movieId || mapped.startTime < new Date()) {
          skipped++;
          continue;
        }

        const auditoriumKey = `${cinemaId}:${mapped.auditoriumName}`;
        let auditoriumPromise = auditoriumPromises.get(auditoriumKey);
        if (!auditoriumPromise) {
          auditoriumPromise = (async () => {
            const where = {
              cinemaId_name: { cinemaId, name: mapped.auditoriumName },
            };
            const existing = await prisma.auditorium.findUnique({ where });
            if (!existing) {
              return prisma.auditorium.create({
                data: {
                  cinemaId,
                  name: mapped.auditoriumName,
                  tier: mapped.tier,
                  defaultFormat: mapped.format,
                },
              });
            }
            if (mapped.tier !== 'STANDARD' && existing.tier !== mapped.tier) {
              return prisma.auditorium.update({
                where,
                data: { tier: mapped.tier, defaultFormat: mapped.format },
              });
            }
            return existing;
          })();
          auditoriumPromises.set(auditoriumKey, auditoriumPromise);
        }
        const auditorium = await auditoriumPromise;
        const data = {
          movieId,
          auditoriumId: auditorium.id,
          dedupKey: mapped.dedupKey,
          startTime: mapped.startTime,
          endTime: mapped.endTime,
          localDate: mapped.localDate,
          format: mapped.format,
          formatRaw: mapped.formatRaw,
          versionCode: mapped.versionCode,
          kind: mapped.kind,
          captionMode: mapped.captionMode,
          audioLanguage: mapped.audioLanguage,
          subtitleLanguage: mapped.subtitleLanguage,
          providerTotalSeats: mapped.providerTotalSeats,
          providerBookedSeats: mapped.providerBookedSeats,
          lastSyncedAt: new Date(),
          lastSeenAt: new Date(),
        };
        const existing = await prisma.showtime.findFirst({
          where: {
            OR: [
              { cinemaId, externalId: mapped.externalId },
              { auditoriumId: auditorium.id, startTime: mapped.startTime },
              { dedupKey: mapped.dedupKey },
            ],
          },
        });
        if (existing) {
          await prisma.showtime.update({
            where: { id: existing.id },
            data: { cinemaId, externalId: mapped.externalId, ...data },
          });
        } else {
          await prisma.showtime.create({
            data: { cinemaId, externalId: mapped.externalId, ...data },
          });
        }
        saved++;
      } catch {
        failed++;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(12, sessions.length) }, () => worker()));
  return { saved, skipped, failed };
}
