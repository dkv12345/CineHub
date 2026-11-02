import { prisma } from '@cinehub/db';

const dto = (movie, matchReason) => ({
  id: movie.id,
  title: movie.title,
  posterUrl: movie.posterUrl,
  ageRating: movie.ageRating,
  status: movie.status,
  rating: Number(movie.sources[0]?.sourceScore ?? movie.ratingAvg ?? 0),
  genres: movie.genres.map(({ genre }) => genre.name),
  matchReason,
});

export async function getRecommendations({ recentMovieIds, favoriteMovieIds }) {
  const seenIds = [...new Set([...recentMovieIds, ...favoriteMovieIds])];
  const [tasteMovies, candidates] = await Promise.all([
    seenIds.length
      ? prisma.movie.findMany({
          where: { id: { in: seenIds }, deletedAt: null },
          select: {
            id: true,
            genres: { select: { genreId: true, genre: { select: { name: true } } } },
          },
        })
      : [],
    prisma.movie.findMany({
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
    }),
  ]);

  const favorites = new Set(favoriteMovieIds);
  const recent = new Map(recentMovieIds.map((id, index) => [id, recentMovieIds.length - index]));
  const affinity = new Map();
  for (const movie of tasteMovies) {
    const weight = favorites.has(movie.id) ? 3 : 1 + (recent.get(movie.id) || 0) / 20;
    for (const { genreId } of movie.genres) {
      affinity.set(genreId, (affinity.get(genreId) || 0) + weight);
    }
  }

  const ranked = candidates
    .map((movie) => {
      const overlap = movie.genres.reduce(
        (sum, { genreId }) => sum + (affinity.get(genreId) || 0),
        0,
      );
      const sourceRating = Number(movie.sources[0]?.sourceScore ?? 0) / 10;
      const localRating = Number(movie.ratingAvg ?? 0) / 5;
      const popularity = Math.max(sourceRating, localRating);
      const activity = Math.min(movie._count.showtimes, 30) / 30;
      return {
        movie,
        score: overlap * 4 + popularity * 2 + activity,
        overlap,
      };
    })
    .sort((a, b) => b.score - a.score || a.movie.title.localeCompare(b.movie.title, 'vi'))
    .slice(0, 6)
    .map(({ movie }) => {
      const candidateGenreNames = movie.genres
        .filter(({ genreId }) => affinity.has(genreId))
        .map(({ genre }) => genre.name)
        .slice(0, 2);
      const matchReason = candidateGenreNames.length
        ? `Hợp gu ${candidateGenreNames.join(', ')}`
        : movie.status === 'NOW_SHOWING'
          ? 'Đang chiếu và được quan tâm'
          : 'Phim sắp chiếu nổi bật';
      return dto(movie, matchReason);
    });

  return ranked;
}
