import { prisma } from '@cinehub/db';

export async function getMovieById(id) {
  const movie = await prisma.movie.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
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
    },
  });

  if (!movie) return null;

  return {
    id: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    durationMin: movie.durationMin,
    ageRating: movie.ageRating,
    status: movie.status,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    trailerUrl: movie.trailerUrl,
    releaseDate: movie.releaseDate,
    country: movie.country,
    rating: Number(movie.ratingAvg),
    ratingCount: movie.ratingCount,
    genres: movie.genres.map(({ genre }) => genre.name),
    directors: movie.credits
      .filter(({ role }) => role === 'DIRECTOR')
      .map(({ person }) => person.fullName),
    cast: movie.credits.filter(({ role }) => role === 'ACTOR').map(({ person }) => person.fullName),
  };
}
