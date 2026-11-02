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
  return prisma.cinema.findMany({ where: { isActive: true } });
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
