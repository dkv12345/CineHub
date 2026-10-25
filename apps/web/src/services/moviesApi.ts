export type DatabaseMovie = {
  id: string;
  dbId?: string;
  title: string;
  slug?: string;
  synopsis: string | null;
  duration?: string;
  durationMin: number | null;
  ageRating: string | null;
  age?: string;
  status: string;
  poster?: string;
  posterUrl: string | null;
  backdrop?: string;
  backdropUrl: string | null;
  trailer?: string;
  trailerUrl: string | null;
  release?: string;
  releaseDate: string | null;
  country: string | null;
  rating: number;
  ratingCount: number;
  votes?: number;
  genres: string[];
  genre?: string;
  directors: string[];
  director?: string;
  cast: string[];
  themeKey?: string;
  views?: number;
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
