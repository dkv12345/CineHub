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
  return result.data || null;
}

export async function fetchMovies(signal?: AbortSignal) {
  try {
    const response = await fetch('/api/movies', { signal });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const result = await response.json();
    if (Array.isArray(result.data) && result.data.length > 0) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.warn('API /api/movies unavailable, falling back to static catalog:', error);
    return [];
  }
}
