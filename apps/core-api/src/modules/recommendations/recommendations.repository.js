import { prisma } from '@cinehub/db';

export function findMoviesGenresByIds(ids) {
  return prisma.movie.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      genres: { select: { genreId: true, genre: { select: { name: true } } } },
    },
  });
}

export function findRecommendationCandidates(seenIds) {
  return prisma.movie.findMany({
    where: {
      deletedAt: null,
      status: { in: ['NOW_SHOWING', 'COMING_SOON'] },
      ...(seenIds.length ? { id: { notIn: seenIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      posterUrl: true,
      ageRating: true,
      status: true,
      ratingAvg: true,
      genres: { select: { genreId: true, genre: { select: { name: true } } } },
      sources: {
        orderBy: { lastSyncedAt: 'desc' },
        take: 1,
        select: { sourceScore: true },
      },
      _count: { select: { showtimes: true } },
    },
  });
}
