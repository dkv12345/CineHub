import { describe, expect, it } from 'vitest';
import { buildShowtimesLink, buildShowtimesQueryParams } from '../src/index';

describe('buildShowtimesLink', () => {
  it('uses the movie ID and optional date and cinema in the shared URL format', () => {
    expect(
      buildShowtimesLink(
        { id: 'database-id', slug: 'phim-a' },
        { date: '2026-11-07', cinemaId: 'cinema-code' },
      ),
    ).toBe('/showtimes?movie=database-id&date=2026-11-07&cinema=cinema-code');
  });

  it('converts the legacy day offset to a Vietnam calendar date', () => {
    const url = new URL(buildShowtimesLink('phim-b', { day: 2 }), 'https://cinehub.test');

    expect(url.pathname).toBe('/showtimes');
    expect(url.searchParams.get('movie')).toBe('phim-b');
    expect(url.searchParams.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('provides query params separately for Angular RouterLink bindings', () => {
    expect(
      buildShowtimesQueryParams(
        { id: 'movie-id', slug: 'movie-slug' },
        { date: '2026-11-08', cinemaId: 'cinema-code' },
      ),
    ).toEqual({
      movie: 'movie-id',
      date: '2026-11-08',
      cinema: 'cinema-code',
    });
  });
});
