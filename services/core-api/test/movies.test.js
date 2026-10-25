import { afterEach, describe, expect, it, vi } from 'vitest';

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock('@cinehub/db', () => ({
  prisma: { movie: { findFirst } },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('getMovieById', () => {
  it('returns public movie details by the database ID used by chatbot links', async () => {
    findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Sample Movie',
      synopsis: 'A sample synopsis',
      durationMin: 120,
      ageRating: 'T13',
      status: 'NOW_SHOWING',
      posterUrl: '/poster.jpg',
      backdropUrl: '/backdrop.jpg',
      trailerUrl: null,
      releaseDate: new Date('2026-10-01T00:00:00.000Z'),
      country: 'Việt Nam',
      ratingAvg: { toString: () => '4.5' },
      ratingCount: 12,
      genres: [{ genre: { name: 'Hành động' } }],
      credits: [
        { role: 'DIRECTOR', person: { fullName: 'Đạo diễn' } },
        { role: 'ACTOR', person: { fullName: 'Diễn viên' } },
      ],
    });

    const { getMovieById } = await import('../src/modules/movies/movies.service.js');
    const movie = await getMovieById('11111111-1111-4111-8111-111111111111');

    expect(movie).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Sample Movie',
      rating: 4.5,
      genres: ['Hành động'],
      directors: ['Đạo diễn'],
      cast: ['Diễn viên'],
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { id: movie.id },
            { slug: movie.id },
            { sources: { some: { externalId: movie.id } } },
          ],
          deletedAt: null,
        },
      }),
    );
  });

  it('returns null for movies that do not exist', async () => {
    findFirst.mockResolvedValue(null);
    const { getMovieById } = await import('../src/modules/movies/movies.service.js');

    await expect(getMovieById('11111111-1111-4111-8111-111111111111')).resolves.toBeNull();
  });
});
