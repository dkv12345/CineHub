import { http, HttpResponse } from 'msw';
import { movies, cinemas, combos } from '@cinehub/web/shared/util';

/**
 * MSW (Mock Service Worker) request handlers for local development and integration tests.
 * Only loaded when `environment.useMocks === true` — never included in the production bundle.
 */
export const cinehubMswHandlers = [
  http.get('/api/v1/health', () => {
    return HttpResponse.json({ status: 'ok', db: 'up' });
  }),

  http.get('/api/v1/movies', () => {
    return HttpResponse.json({ data: movies });
  }),

  http.get('/api/v1/cinemas', () => {
    return HttpResponse.json({ data: cinemas });
  }),

  http.get('/api/v1/concessions', () => {
    return HttpResponse.json({ data: combos });
  }),

  http.post('/api/v1/chatbot/message', async ({ request }) => {
    const body = (await request.json()) as { message?: string; sessionId?: string };
    return HttpResponse.json({
      sessionId: body.sessionId ?? '00000000-0000-4000-8000-000000000001',
      reply: `CineBot: Đã nhận câu hỏi "${body.message ?? ''}". Mình gợi ý các suất chiếu và phim nổi bật tại hệ thống rạp CineHub / Galaxy. Bạn có thể bấm trực tiếp vào phim hoặc suất chiếu bên dưới để đặt vé ngay!`,
      intent: 'RECOMMEND',
      category: 'Search Movies',
      movies: movies.slice(0, 3).map((m) => ({
        id: String(m.id),
        title: m.title,
        synopsis: m.synopsis,
        durationMin: parseInt(m.duration, 10) || 120,
        ageRating: m.age,
        posterUrl: m.poster,
        genres: [m.genre],
        rating: m.rating,
        nextShowtimes: [
          {
            id: '1',
            time: '19:30',
            date: 'Hôm nay',
            format: '2D Phụ đề',
            cinemaName: 'Galaxy Nguyễn Du',
          },
          {
            id: '2',
            time: '21:15',
            date: 'Hôm nay',
            format: 'IMAX Laser',
            cinemaName: 'Galaxy Nguyễn Du',
          },
        ],
      })),
    });
  }),

  http.post('/api/v1/recommendations', () => {
    return HttpResponse.json({
      data: movies.slice(0, 4).map((m) => ({
        movieId: String(m.id),
        title: m.title,
        rating: m.rating,
        matchReason: ['Cùng thể loại yêu thích', 'Đánh giá cao tại rạp'],
        posterUrl: m.poster,
      })),
    });
  }),
];
