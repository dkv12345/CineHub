import { prisma } from '@cinehub/db';

export function findMovies(where) {
  return prisma.movie.findMany({
    where,
    include: {
      genres: { select: { genre: { select: { name: true, slug: true } } } },
      credits: {
        orderBy: { billingOrder: 'asc' },
        select: { role: true, person: { select: { fullName: true } } },
      },
      sources: { select: { externalId: true, sourceScore: true, sourceVotes: true } },
    },
    orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
  });
}

export function findMovieByIdOrSlugOrExternalId(id) {
  return prisma.movie.findFirst({
    where: {
      OR: [{ id }, { slug: id }, { sources: { some: { externalId: id } } }],
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      synopsis: true,
      durationMin: true,
      ageRating: true,
      status: true,
      posterUrl: true,
      backdropUrl: true,
      trailerUrl: true,
      releaseDate: true,
      country: true,
      ratingAvg: true,
      ratingCount: true,
      genres: { select: { genre: { select: { name: true } } } },
      credits: {
        orderBy: { billingOrder: 'asc' },
        select: { role: true, person: { select: { fullName: true } } },
      },
      sources: { select: { externalId: true, sourceScore: true, sourceVotes: true } },
    },
  });
}
