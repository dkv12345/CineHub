export type DatabaseMovie = {
  id: string;
  title: string;
  synopsis: string | null;
  durationMin: number | null;
  ageRating: string | null;
  status: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  releaseDate: string | null;
  country: string | null;
  rating: number;
  ratingCount: number;
  genres: string[];
  directors: string[];
  cast: string[];
};

export async function fetchMovieById(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/movies/${encodeURIComponent(id)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Không thể tải thông tin phim (HTTP ${response.status}).`);
  }

  const result: { data: DatabaseMovie } = await response.json();
  if (!result.data || result.data.id !== id) {
    throw new Error('Dữ liệu phim từ máy chủ không hợp lệ.');
  }
  return result.data;
}
