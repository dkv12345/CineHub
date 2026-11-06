import { prisma } from '@cinehub/db';

export const MOVIE_SELECT = {
  id: true,
  title: true,
  titleNormalized: true,
  synopsis: true,
  durationMin: true,
  ageRating: true,
  posterUrl: true,
  status: true,
  ratingAvg: true,
  genres: { include: { genre: { select: { name: true } } } },
  sources: {
    orderBy: { lastSyncedAt: 'desc' },
    take: 1,
    select: { sourceScore: true },
  },
};

export function countNonDeletedMovies() {
  return prisma.movie.count({ where: { deletedAt: null } });
}

export function findAllGenres() {
  return prisma.genre.findMany({ select: { id: true, slug: true, name: true } });
}

export function findMoviesForCatalog(where, orderBy) {
  return prisma.movie.findMany({
    where,
    select: MOVIE_SELECT,
    ...(orderBy ? { orderBy } : {}),
  });
}

export function findActiveCinemas() {
  return prisma.cinema.findMany({
    where: { isActive: true },
    include: {
      province: { select: { id: true, name: true } },
      chain: { select: { id: true, name: true, code: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export function findUpcomingShowtimesForMovies(movieIds, { from, until } = {}) {
  const now = new Date();
  return prisma.showtime.findMany({
    where: {
      movieId: { in: movieIds },
      status: { in: ['SCHEDULED', 'OPEN'] },
      startTime: {
        gte: from ?? now,
        ...(until ? { lte: until } : {}),
      },
    },
    include: {
      cinema: { select: { id: true, name: true } },
      movie: { select: { id: true, title: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

export function findShowtimes({ where, include, orderBy, take }) {
  return prisma.showtime.findMany({
    where,
    include,
    orderBy,
    take,
  });
}

export function findActiveGalaxyAdultPriceRules() {
  return prisma.priceRule.findMany({
    where: {
      isActive: true,
      chain: { code: 'GALAXY' },
      ticketType: { code: 'ADULT' },
    },
    include: { seatType: { select: { name: true } } },
  });
}

export function findChildrenMovies({ take = 6 } = {}) {
  return prisma.movie.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ageRating: { in: ['P', 'K'] } },
        { genres: { some: { genre: { name: { in: ['Hoạt hình', 'Gia đình'] } } } } },
      ],
      NOT: [
        { ageRating: { in: ['T16', 'T18'] } },
        { genres: { some: { genre: { name: { in: ['Kinh dị', 'Giật gân'] } } } } },
      ],
    },
    select: MOVIE_SELECT,
    orderBy: [{ status: 'asc' }, { ratingAvg: 'desc' }],
    take,
  });
}

export async function findShowtimesWithFallback({ baseWhere, include, take = 10 }) {
  let showtimes = await prisma.showtime.findMany({
    where: baseWhere,
    include,
    orderBy: { startTime: 'asc' },
    take,
  });

  if (showtimes.length === 0 && baseWhere.startTime?.gte) {
    const relaxedWhere = { ...baseWhere };
    delete relaxedWhere.startTime;
    showtimes = await prisma.showtime.findMany({
      where: relaxedWhere,
      include,
      orderBy: { startTime: 'desc' },
      take,
    });
    showtimes.sort((a, b) => a.startTime - b.startTime);
  }

  return showtimes;
}

export function findMovieByIdOrTitle(idOrTitle) {
  if (!idOrTitle) return null;
  return prisma.movie.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { id: idOrTitle },
        { slug: idOrTitle },
        { title: { contains: idOrTitle } },
        { titleNormalized: { contains: idOrTitle.toLowerCase() } },
      ],
    },
    select: MOVIE_SELECT,
  });
}
