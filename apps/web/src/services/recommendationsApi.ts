export type MovieRecommendation = {
  id: string;
  title: string;
  posterUrl: string | null;
  ageRating: string | null;
  status: 'NOW_SHOWING' | 'COMING_SOON';
  rating: number;
  genres: string[];
  matchReason: string;
};

export async function fetchRecommendations(
  recentMovieIds: (string | number)[],
  favoriteMovieIds: (string | number)[],
  signal?: AbortSignal,
) {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recentMovieIds: recentMovieIds.map(String).slice(0, 20),
      favoriteMovieIds: favoriteMovieIds.map(String).slice(0, 20),
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Không thể tải gợi ý phim (HTTP ${response.status}).`);
  }
  const result: { data: MovieRecommendation[] } = await response.json();
  if (!Array.isArray(result.data)) {
    throw new Error('Dữ liệu gợi ý phim từ máy chủ không hợp lệ.');
  }
  return result.data;
}
