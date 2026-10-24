import { describe, expect, it } from 'vitest';
import type { GalaxySession } from '../services/sessionsApi';
import { filterShowtimes } from './showtimeFilters';

const makeSession = (
  overrides: Partial<GalaxySession> & Pick<GalaxySession, 'id' | 'showDate' | 'movieFormat'>,
): GalaxySession => ({
  showTime: '19:00',
  screenName: 'Phòng 1',
  totalSeat: 100,
  bookedSeat: 10,
  caption: 'sub',
  version: '2d',
  movie: {
    id: 'movie-1',
    name: 'Phim A',
    age: 'P',
    duration: 120,
    startDate: '',
    endDate: '',
    createdAt: '',
    imageLandscape: '',
    imagePortrait: '',
    slug: 'phim-a',
    trailer: '',
    rate: 0,
    totalVotes: 0,
    views: 0,
    order: 0,
  },
  cinema: {
    id: 'cinema-1',
    code: 'CGV-1',
    name: 'Rạp trung tâm',
    latitude: '',
    longitude: '',
    address: 'Quận 1',
    phone: '',
    cityId: '599535ea-1ea2-4393-9b5a-3ba3a807f363',
    imageLandscape: '',
    imagePortrait: '',
    imageUrls: [],
    order: 0,
  },
  ...overrides,
});

describe('filterShowtimes', () => {
  const sessions = [
    makeSession({ id: '1', showDate: '2026-10-22', movieFormat: '2D' }),
    makeSession({
      id: '2',
      showDate: '2026-10-22',
      movieFormat: 'IMAX',
      movie: {
        id: 'movie-2',
        name: 'Phim B',
        age: 'P',
        duration: 90,
        startDate: '',
        endDate: '',
        createdAt: '',
        imageLandscape: '',
        imagePortrait: '',
        slug: 'phim-b',
        trailer: '',
        rate: 0,
        totalVotes: 0,
        views: 0,
        order: 0,
      },
      cinema: {
        id: 'cinema-2',
        code: 'CGV-2',
        name: 'Rạp Hà Nội',
        latitude: '',
        longitude: '',
        address: '',
        phone: '',
        cityId: 'f4bf5f53-4e80-40c8-b1e0-f11ffa9a636a',
        imageLandscape: '',
        imagePortrait: '',
        imageUrls: [],
        order: 0,
      },
      caption: 'voice',
      version: 'imax',
    }),
    makeSession({ id: '3', showDate: '2026-10-23', movieFormat: '2D' }),
  ];

  it('applies date, movie, city, cinema, format, caption, and version together', () => {
    expect(
      filterShowtimes(sessions, {
        date: '2026-10-22',
        movieId: 'movie-1',
        cityId: 'TP. Hồ Chí Minh',
        cinemaId: 'CGV-1',
        format: '2d',
        caption: 'SUB',
        version: '2D',
      }).map((session) => session.id),
    ).toEqual(['1']);
  });

  it('matches city IDs, city names, and cinema codes consistently', () => {
    expect(
      filterShowtimes(sessions, { cityId: '599535ea-1ea2-4393-9b5a-3ba3a807f363' }),
    ).toHaveLength(2);
    expect(filterShowtimes(sessions, { cityName: 'ha noi' }).map((session) => session.id)).toEqual([
      '2',
    ]);
    expect(filterShowtimes(sessions, { cinemaId: 'CGV-2' }).map((session) => session.id)).toEqual([
      '2',
    ]);
  });
});
