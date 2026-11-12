import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  findReferences: vi.fn(),
  findRecent: vi.fn(),
  syncLive: vi.fn(),
}));

vi.mock('../src/platform/cache/redis.js', () => ({
  getRedisClient: () => ({ get: mocks.cacheGet, set: mocks.cacheSet }),
}));

vi.mock('../src/modules/sessions/sessions.repository.js', () => ({
  findLiveSessionReferences: mocks.findReferences,
  findRecentAndUpcomingShowtimes: mocks.findRecent,
  syncLiveShowtimes: mocks.syncLive,
}));

import { listSessions } from '../src/modules/sessions/sessions.service.js';

describe('listSessions live schedule', () => {
  beforeEach(() => {
    mocks.cacheGet.mockResolvedValue(null);
    mocks.cacheSet.mockResolvedValue('OK');
    mocks.findReferences.mockResolvedValue({
      cinemaIds: new Map([['CIN-1', 'cinema-db-id']]),
      movieIds: new Map([
        ['movie-external-1', 'movie-db-id-1'],
        ['movie-external-2', 'movie-db-id-2'],
      ]),
    });
    mocks.syncLive.mockResolvedValue({ saved: 2, skipped: 0, failed: 0 });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input) => {
        if (String(input).includes('/cinemas')) {
          return new Response('', { headers: { 'set-cookie': 'sid=test; Path=/' } });
        }
        return new Response(
          JSON.stringify({
            data: {
              result: [
                {
                  id: 'show-1',
                  showDate: '2099-11-07',
                  showTime: '00:30',
                  screenName: 'Screen 1',
                  totalSeat: 0,
                  bookedSeat: 0,
                  caption: 'sub',
                  version: '2d',
                  movieFormat: '2D Phụ Đề',
                  movie: { id: 'movie-external-1', name: 'Phim A', slug: 'phim-a' },
                  cinema: { code: 'CIN-1', name: 'Rạp 1', imageLandscape: 'cinema.jpg' },
                },
                {
                  id: 'show-2',
                  showDate: '2099-11-07',
                  showTime: '19:30',
                  screenName: 'Screen 1',
                  totalSeat: 0,
                  bookedSeat: 0,
                  caption: 'voice',
                  version: '2d',
                  movieFormat: '2D Lồng Tiếng',
                  movie: { id: 'movie-external-2', name: 'Phim B', slug: 'phim-b' },
                  cinema: { code: 'CIN-1', name: 'Rạp 1' },
                },
                {
                  id: 'show-cancelled',
                  showDate: '2099-11-07',
                  showTime: '20:30',
                  status: 'CANCELLED',
                  movie: { id: 'movie-external-1', name: 'Phim A', slug: 'phim-a' },
                  cinema: { code: 'CIN-1', name: 'Rạp 1' },
                },
              ],
            },
          }),
        );
      }),
    );
  });

  it('filters live results by slug and local show date while preserving resolved database IDs', async () => {
    const result = await listSessions({ movie: 'phim-a', date: '2099-11-07' });

    expect(result.source).toBe('galaxy');
    expect(result.stale).toBe(false);
    expect(result.result).toHaveLength(1);
    expect(result.result[0]).toMatchObject({
      id: 'show-1',
      showDate: '2099-11-07',
      showTime: '00:30',
      movie: { id: 'movie-external-1', dbId: 'movie-db-id-1', slug: 'phim-a' },
      cinema: { id: 'CIN-1', dbId: 'cinema-db-id' },
    });
    expect(mocks.syncLive).toHaveBeenCalledOnce();

    const allOnDate = await listSessions({ date: '2099-11-07' });
    expect(allOnDate.result.map((session) => session.id)).toEqual(['show-1', 'show-2']);
  });
});
