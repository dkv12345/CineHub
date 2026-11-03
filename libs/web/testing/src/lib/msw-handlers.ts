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
      reply: `CineBot (mock): Đã nhận câu hỏi "${body.message ?? ''}". Gợi ý phim đang chiếu nổi bật tại Galaxy Cinema!`,
      intent: 'MOVIE_RECOMMENDATION',
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
