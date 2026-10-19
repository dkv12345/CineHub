import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  findMovies,
  findMovieCount,
  findGenres,
  findShowtimes,
  looksSemantic,
  semanticSearch,
  loadSession,
  createSession,
  saveTurn,
} = vi.hoisted(() => ({
  findMovies: vi.fn(),
  findMovieCount: vi.fn(),
  findGenres: vi.fn(),
  findShowtimes: vi.fn().mockResolvedValue([]),
  looksSemantic: vi.fn(),
  semanticSearch: vi.fn(),
  loadSession: vi.fn(),
  createSession: vi.fn(),
  saveTurn: vi.fn(),
}));

vi.mock('@cinehub/db', () => ({
  prisma: {
    movie: { findMany: findMovies, count: findMovieCount },
    genre: { findMany: findGenres },
    cinema: { findMany: vi.fn().mockResolvedValue([]) },
    showtime: { findMany: findShowtimes },
    priceRule: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('../src/modules/chatbot/chatbot.nlp.js', async (importOriginal) => ({
  ...(await importOriginal()),
  looksSemantic,
}));

vi.mock('../src/modules/chatbot/chatbot.vector.js', () => ({
  semanticSearch,
}));

vi.mock('../src/modules/chatbot/chatbot.session.js', () => ({
  loadSession,
  createSession,
  saveTurn,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
  loadSession.mockResolvedValue(null);
  createSession.mockResolvedValue(null);
  saveTurn.mockResolvedValue(false);
  findMovieCount.mockResolvedValue(0);
  findShowtimes.mockResolvedValue([]);
});

const movie = (id, title, status = 'NOW_SHOWING') => ({
  id,
  title,
  synopsis: 'Movie synopsis',
  durationMin: 100,
  ageRating: 'T13',
  posterUrl: null,
  status,
  ratingAvg: 4,
  sources: [],
  genres: [{ genre: { name: 'Tình cảm' } }],
});

describe('CineBot semantic recommendations', () => {
  it('uses the first remembered movie for a follow-up showtime request', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    const session = {
      sessionId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: null,
      messages: [],
      lastMovies: [
        { id: 'movie-a', title: 'Phim A' },
        { id: 'movie-b', title: 'Phim B' },
      ],
    };
    loadSession.mockResolvedValue(session);
    saveTurn.mockResolvedValue(true);
    findMovies.mockResolvedValue([movie('movie-a', 'Phim A'), movie('movie-b', 'Phim B')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim đầu tiên chiếu lúc mấy giờ?', {
      sessionId: session.sessionId,
    });

    expect(result.intent).toBe('SHOWTIMES');
    expect(result.sessionId).toBe(session.sessionId);
    expect(findShowtimes.mock.calls[0][0].where.movieId).toBe('movie-a');
    expect(saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        session,
        result: expect.objectContaining({ movies: [expect.objectContaining({ id: 'movie-a' })] }),
      }),
    );
    expect(createSession).not.toHaveBeenCalled();
  });

  it('uses the second remembered movie for a diacritic-free details follow-up', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const session = {
      sessionId: 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: null,
      messages: [],
      lastMovies: [
        { id: 'movie-a', title: 'Phim A' },
        { id: 'movie-b', title: 'Phim B' },
      ],
    };
    loadSession.mockResolvedValue(session);
    saveTurn.mockResolvedValue(true);
    findMovies.mockResolvedValue([movie('movie-a', 'Phim A'), movie('movie-b', 'Phim B')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim thu hai noi ve gi', {
      sessionId: session.sessionId,
    });

    expect(result.intent).toBe('MOVIE_DETAILS');
    expect(result.movie).toMatchObject({ id: 'movie-b', title: 'Phim B' });
    expect(result.reply).toContain('Phim B');
    expect(saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ movie: expect.objectContaining({ id: 'movie-b' }) }),
      }),
    );
  });

  it('asks the user to choose when a demonstrative refers to multiple remembered movies', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    const session = {
      sessionId: 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: null,
      messages: [],
      lastMovies: [
        { id: 'movie-a', title: 'Phim A' },
        { id: 'movie-b', title: 'Phim B' },
      ],
    };
    loadSession.mockResolvedValue(session);
    findMovies.mockResolvedValue([movie('movie-a', 'Phim A'), movie('movie-b', 'Phim B')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim đó chiếu lúc mấy giờ?', {
      sessionId: session.sessionId,
    });

    expect(result.intent).toBe('SHOWTIMES');
    expect(result.reply).toContain('Bạn muốn hỏi phim nào trong: Phim A, Phim B?');
    expect(findShowtimes).not.toHaveBeenCalled();
  });

  it('starts a fresh server-generated session for an unknown client ID', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    loadSession.mockResolvedValue(null);
    const newSession = {
      sessionId: 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: null,
      messages: [],
      lastMovies: [],
    };
    createSession.mockResolvedValue(newSession);
    saveTurn.mockResolvedValue(true);
    findMovies.mockResolvedValue([]);
    findMovieCount.mockResolvedValue(0);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Phim nào đang chiếu?', {
      sessionId: 'ccccccc1-cccc-4ccc-8ccc-cccccccccccc',
    });

    expect(loadSession).toHaveBeenCalledWith({
      sessionId: 'ccccccc1-cccc-4ccc-8ccc-cccccccccccc',
      userId: undefined,
    });
    expect(createSession).toHaveBeenCalledWith({ userId: undefined });
    expect(result.sessionId).toBe(newSession.sessionId);
  });

  it('uses the database action genre for colloquial “đánh nhau” recommendations', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([{ id: 'action-id', name: 'Hành động', slug: 'hanh-dong' }]);
    findMovies.mockResolvedValue([movie('action-movie', 'Phim hành động')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Tôi thích xem phim đánh nhau, gợi ý cho tôi');

    expect(result.intent).toBe('RECOMMEND');
    expect(result.movies.map(({ id }) => id)).toEqual(['action-movie']);
    expect(result.reply).toContain('Phim Hành động');
    expect(findMovies.mock.calls[0][0].where).toMatchObject({
      deletedAt: null,
      genres: { some: { genreId: 'action-id' } },
    });
    expect(semanticSearch).not.toHaveBeenCalled();
  });

  it('applies the requested evening window to colloquial genre recommendations', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([{ id: 'action-id', name: 'Hành động', slug: 'hanh-dong' }]);
    findMovies.mockResolvedValue([movie('action-movie', 'Phim hành động')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Phim đánh nhau tối nay');
    const where = findMovies.mock.calls[0][0].where;

    expect(result.intent).toBe('RECOMMEND');
    expect(result.reply).toContain('Hành động');
    expect(where.genres).toEqual({ some: { genreId: 'action-id' } });
    expect(where.showtimes.some.status.in).toEqual(['SCHEDULED', 'OPEN']);
    expect(where.showtimes.some.startTime.gte).toBeInstanceOf(Date);
    expect(where.showtimes.some.startTime.lte).toBeInstanceOf(Date);
  });

  it('uses semantic search for recommendation prompts with descriptive content', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    semanticSearch.mockResolvedValue([{ movieId: 'movie-twist', score: 0.91 }]);
    findMovies.mockResolvedValue([movie('movie-twist', 'Phim plot twist')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Gợi ý phim có plot twist');

    expect(result.intent).toBe('SEMANTIC');
    expect(semanticSearch).toHaveBeenCalledWith('Gợi ý phim có plot twist');
    expect(result.movies.map(({ id }) => id)).toEqual(['movie-twist']);
  });

  it('reports when the configured database contains no movies', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findMovies.mockResolvedValue([]);
    findMovieCount.mockResolvedValue(0);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Phim nào đang chiếu?');

    expect(result.reply).toContain('Hiện chưa tìm thấy phim');
    expect(result.diagnostic).toContain('MySQL is reachable');
    expect(result.diagnostic).toContain('0 non-deleted movies');
    expect(findMovieCount).toHaveBeenCalledWith({ where: { deletedAt: null } });
  });

  it('reports when movies exist but none are currently showing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findMovies.mockResolvedValue([]);
    findMovieCount.mockResolvedValue(43);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Phim nào đang chiếu?');

    expect(result.diagnostic).toContain('found 43 movies');
    expect(result.diagnostic).toContain('NOW_SHOWING');
    expect(result.diagnostic).toContain('SCHEDULED/OPEN');
  });

  it('includes movies with active upcoming showtimes even if their movie status is stale', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const currentMovie = movie('movie-current', 'Phim đang chiếu');
    const scheduledMovie = movie('movie-scheduled', 'Phim có suất chiếu', 'COMING_SOON');
    findMovies.mockResolvedValue([currentMovie, scheduledMovie]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('Phim nào đang chiếu?');
    const query = findMovies.mock.calls[0][0];

    expect(result.intent).toBe('NOW_SHOWING');
    expect(result.movies.map(({ id }) => id)).toEqual(['movie-current', 'movie-scheduled']);
    expect(result.reply).toContain('Phim đang chiếu');
    expect(result.reply).toContain('Phim có suất chiếu');
    expect(query.where.deletedAt).toBeNull();
    expect(query.where.OR).toEqual([
      { status: 'NOW_SHOWING' },
      {
        showtimes: {
          some: {
            status: { in: ['SCHEDULED', 'OPEN'] },
            startTime: { gte: expect.any(Date) },
          },
        },
      },
    ]);
  });

  it('returns database-verified movies in vector similarity order with scores', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    looksSemantic.mockReturnValue(true);
    semanticSearch.mockResolvedValue([
      { movieId: 'movie-a', score: 0.81 },
      { movieId: 'movie-b', score: 0.94 },
    ]);
    findMovies.mockResolvedValue([movie('movie-a', 'Phim A'), movie('movie-b', 'Phim B')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim nào hợp đi hẹn hò');

    expect(result.intent).toBe('SEMANTIC');
    expect(result.movies.map(({ id, score }) => [id, score])).toEqual([
      ['movie-b', 0.94],
      ['movie-a', 0.81],
    ]);
    expect(result.reply).toContain('Dựa trên nội dung phim');
    expect(findMovies).toHaveBeenCalledOnce();
    expect(findMovies.mock.calls[0][0].where).not.toHaveProperty('showtimes');
  });

  it('filters semantic candidates to showtimes in the requested period', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    looksSemantic.mockReturnValue(true);
    semanticSearch.mockResolvedValue([{ movieId: 'movie-a', score: 0.9 }]);
    findMovies.mockResolvedValue([movie('movie-a', 'Phim A')]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim hợp đi hẹn hò tối nay');
    const where = findMovies.mock.calls[0][0].where;

    expect(result.intent).toBe('SEMANTIC');
    expect(result.period).toBeUndefined();
    expect(where.showtimes.some.status.in).toEqual(['SCHEDULED', 'OPEN']);
    expect(where.showtimes.some.startTime.gte).toBeInstanceOf(Date);
    expect(where.showtimes.some.startTime.lte).toBeInstanceOf(Date);
  });

  it('recommends from all current catalog records when semantic search is unavailable', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    findGenres.mockResolvedValue([]);
    looksSemantic.mockReturnValue(true);
    semanticSearch.mockResolvedValue(null);
    const catalog = Array.from({ length: 43 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return movie(`db-movie-${number}`, `Database Movie ${number}`);
    });
    findMovies.mockResolvedValue(catalog);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim phù hợp đi hẹn hò');

    expect(result.intent).toBe('RECOMMEND');
    expect(result.responseSource).toBe('database');
    expect(result.movies.map(({ id }) => id)).toEqual([
      'db-movie-01',
      'db-movie-02',
      'db-movie-03',
      'db-movie-04',
      'db-movie-05',
      'db-movie-06',
    ]);
    expect(result.reply).toContain('Database Movie 01');
    expect(result.reply).toContain('Database Movie 05');
    expect(result.reply).not.toContain('Database Movie 06');
    expect(catalog).toHaveLength(43);
    expect(fetch).not.toHaveBeenCalled();
    expect(findMovies).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });

  it('only returns current database movies even when vector results are stale', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    looksSemantic.mockReturnValue(true);
    semanticSearch.mockResolvedValue([
      { movieId: 'stale-movie-id', score: 0.99 },
      { movieId: 'current-movie-id', score: 0.8 },
    ]);
    findMovies.mockResolvedValue([
      movie('current-movie-id', 'Current Database Movie'),
      movie('current-without-vector', 'Unembedded Current Movie'),
    ]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('phim giống phim tình cảm');

    expect(result.movies.map(({ id }) => id)).toEqual([
      'current-movie-id',
      'current-without-vector',
    ]);
    expect(result.reply).toContain('Current Database Movie');
    expect(result.reply).not.toContain('stale-movie-id');
    expect(findMovies.mock.calls[0][0].where).toEqual({ deletedAt: null });
  });
});
