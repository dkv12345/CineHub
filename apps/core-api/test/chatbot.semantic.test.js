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

vi.mock('../src/modules/chatbot/chatbot.session.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSession,
  createSession,
  saveTurn,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
  looksSemantic.mockReset();
  semanticSearch.mockReset();
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
    const result = await answerMessage('phim đó nói về gì?', {
      sessionId: session.sessionId,
    });

    expect(result.intent).toBe('MOVIE_DETAILS');
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
    expect(semanticSearch).toHaveBeenCalledWith('Phim phù hợp: Gợi ý có plot twist', {
      limit: 100,
    });
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
    vi.stubEnv('GEMINI_API_KEY', '');
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

    expect(result.movies.map(({ id }) => id)).toEqual(['current-movie-id']);
    expect(result.reply).toContain('Current Database Movie');
    expect(result.reply).not.toContain('stale-movie-id');
    expect(findMovies.mock.calls[0][0].where).toEqual({ deletedAt: null });
  });

  it('applies business filter consolidation excluding inappropriate age ratings and attaching showtimes', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    findGenres.mockResolvedValue([]);
    findMovies.mockResolvedValue([movie('child-friendly', 'Phim Hoạt Hình Vui Nhộn')]);
    findShowtimes.mockResolvedValue([
      {
        id: 'st-1',
        movieId: 'child-friendly',
        cinemaId: 'cine-1',
        startTime: new Date('2026-11-04T12:30:00Z'),
        format: 'TWO_D',
        formatRaw: '2D Phụ Đề',
        cinema: { id: 'cine-1', name: 'Galaxy Nguyễn Du' },
        movie: { id: 'child-friendly', title: 'Phim Hoạt Hình Vui Nhộn' },
      },
    ]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('gợi ý phim cho trẻ em xem');

    expect(result.category).toBe('Search Movies');
    expect(findMovies).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          ageRating: { notIn: expect.arrayContaining(['T18']) },
        }),
      }),
    );
    expect(result.movies[0].nextShowtimes).toBeDefined();
    expect(result.movies[0].nextShowtimes[0].cinemaName).toBe('Galaxy Nguyễn Du');
  });

  it('answers cinema information requests and categorizes into Cinema Info', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const { prisma } = await import('@cinehub/db');
    prisma.cinema.findMany = vi
      .fn()
      .mockResolvedValue([
        { id: 'c-1', name: 'Galaxy Nguyễn Du', address: '116 Nguyễn Du, Q.1', phone: '19002224' },
      ]);

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');
    const result = await answerMessage('dia chi rap galaxy o dau');

    expect(result.intent).toBe('CINEMA_INFO');
    expect(result.category).toBe('Cinema Info');
    expect(result.reply).toContain('Galaxy Nguyễn Du');
    expect(result.cinemas).toHaveLength(1);
  });

  it('correctly handles multi-turn conversation: children movies -> title selection -> showtime inheritance & coming soon diagnostic', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const { initialConversationContext, mergeConversationContext } =
      await import('../src/modules/chatbot/chatbot.session.js');

    const childMovie = {
      id: 'movie-child',
      title: 'Scotty: Giải Cứu Hoàng Thượng',
      titleNormalized: 'scotty giai cuu hoang thuong',
      synopsis: 'Phim hoạt hình cho trẻ em',
      durationMin: 90,
      ageRating: 'P',
      posterUrl: null,
      status: 'NOW_SHOWING',
      ratingAvg: 4.8,
      sources: [],
      genres: [{ genre: { name: 'Hoạt hình' } }, { genre: { name: 'Gia đình' } }],
    };

    const meMinMovie = {
      id: 'movie-memin',
      title: 'Mẹ Mìn',
      titleNormalized: 'me min',
      synopsis: 'Phim kinh dị giật gân',
      durationMin: 110,
      ageRating: 'T18',
      posterUrl: null,
      status: 'COMING_SOON',
      ratingAvg: 4.5,
      sources: [],
      genres: [{ genre: { name: 'Kinh dị' } }, { genre: { name: 'Giật gân' } }],
    };

    let sessionState = {
      sessionId: 'session-user-flow',
      userId: null,
      messages: [],
      lastMovies: [],
      context: initialConversationContext(),
    };

    loadSession.mockImplementation(async () => sessionState);
    saveTurn.mockImplementation(async ({ result, memory, contextUpdates }) => {
      sessionState = {
        ...sessionState,
        lastMovies: memory?.lastMovies || sessionState.lastMovies,
        context: mergeConversationContext(sessionState.context, contextUpdates),
      };
      return true;
    });

    findMovies.mockImplementation(async ({ where }) => {
      if (where?.ageRating?.notIn?.includes('T18') || where?.NOT) {
        return [childMovie];
      }
      return [childMovie, meMinMovie];
    });

    const { answerMessage } = await import('../src/modules/chatbot/chatbot.service.js');

    // TURN 1: User asks for children movies
    const turn1 = await answerMessage('phim trẻ em', { sessionId: sessionState.sessionId });
    expect(turn1.intent).toBe('RECOMMEND');
    expect(turn1.category).toBe('Search Movies');
    expect(turn1.movies.map((m) => m.id)).toContain('movie-child');
    expect(turn1.movies.map((m) => m.id)).not.toContain('movie-memin');
    expect(turn1.reply).toContain('Scotty: Giải Cứu Hoàng Thượng');
    expect(turn1.reply).not.toContain('Mẹ Mìn');

    // TURN 2: User enters movie title "mẹ mìn"
    const turn2 = await answerMessage('mẹ mìn', { sessionId: sessionState.sessionId });
    expect(turn2.intent).toBe('MOVIE_SELECTION');
    expect(turn2.movie).toMatchObject({ id: 'movie-memin', title: 'Mẹ Mìn' });
    expect(turn2.reply).toContain('Mẹ Mìn');
    expect(turn2.reply).toContain('Sắp chiếu');
    expect(sessionState.context.movie.movieId).toBe('movie-memin');

    // TURN 3: User says short follow-up "lịch chiếu" without naming the movie
    const turn3 = await answerMessage('lịch chiếu', { sessionId: sessionState.sessionId });
    expect(turn3.intent).toBe('SHOWTIMES');
    expect(turn3.category).toBe('Ask Showtimes');
    expect(turn3.movie).toMatchObject({ id: 'movie-memin', title: 'Mẹ Mìn' });
    expect(turn3.reply).toContain('Mẹ Mìn');
    expect(turn3.reply).toContain('Sắp chiếu');
    expect(turn3.reply).not.toContain(
      'Chưa tìm thấy suất chiếu phù hợp. Bạn thử đổi ngày, phim hoặc rạp nhé.',
    );

    // TURN 4: User says "đổi phim khác"
    const turn4 = await answerMessage('đổi phim khác', { sessionId: sessionState.sessionId });
    expect(turn4.intent).toBe('RESET_CONTEXT');
    expect(turn4.reply).toContain('đã xóa lựa chọn phim');
    expect(sessionState.context.movie.movieId).toBeNull();
  });
});
