import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterShowtimes, getShowtimeCityName, type GalaxySession } from '../src/index';

const seedSessions = (
  JSON.parse(
    readFileSync(
      new URL('../../../../../data/seed/sessions_snapshot.json', import.meta.url),
      'utf8',
    ),
  ) as { result: GalaxySession[] }
).result;

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
      filterShowtimes(sessions, {
        cityId: '599535ea-1ea2-4393-9b5a-3ba3a807f363',
      }),
    ).toHaveLength(2);
    expect(filterShowtimes(sessions, { cityName: 'ha noi' }).map((session) => session.id)).toEqual([
      '2',
    ]);
    expect(filterShowtimes(sessions, { cinemaId: 'CGV-2' }).map((session) => session.id)).toEqual([
      '2',
    ]);
  });

  it('matches movie by id, slug, or title flexibly so no showtimes are lost', () => {
    expect(filterShowtimes(sessions, { movieId: 'phim-b' }).map((s) => s.id)).toEqual(['2']);
    expect(filterShowtimes(sessions, { movieId: 'Phim B' }).map((s) => s.id)).toEqual(['2']);
    expect(filterShowtimes(sessions, { cinemaId: 'Rạp Hà Nội' }).map((s) => s.id)).toEqual(['2']);
  });

  it('uses a province name instead of a cinema name when city metadata is missing', () => {
    const session = makeSession({
      id: 'province-name',
      showDate: '2026-10-22',
      movieFormat: '2D',
      cinema: {
        id: 'cinema-1',
        code: 'CGV-1',
        name: 'Rạp Trung Tâm',
        latitude: '',
        longitude: '',
        address: '123 Đường Điện Biên Phủ, Quận 1, TP. Hồ Chí Minh',
        phone: '',
        cityId: 'HCM',
        imageLandscape: '',
        imagePortrait: '',
        imageUrls: [],
        order: 0,
      },
    });

    expect(getShowtimeCityName(session)).toBe('TP. Hồ Chí Minh');
  });

  it('prefers the province in the address when a legacy city ID names the old province', () => {
    const session = makeSession({
      id: 'merged-province',
      showDate: '2026-10-22',
      movieFormat: '2D',
      cinema: {
        id: 'cinema-1',
        code: 'CGV-1',
        name: 'Rạp Bến Tre',
        latitude: '',
        longitude: '',
        address: '26A Trần Quốc Tuấn, Phường An Hội, Tỉnh Vĩnh Long',
        phone: '',
        cityId: '3504c4df-cc0f-4356-a934-260cf5e9ca32',
        imageLandscape: '',
        imagePortrait: '',
        imageUrls: [],
        order: 0,
      },
    });

    expect(getShowtimeCityName(session)).toBe('Vĩnh Long');
  });

  it('does not expose cinema names as province labels for unknown locations', () => {
    const session = makeSession({
      id: 'unknown-province',
      showDate: '2026-10-22',
      movieFormat: '2D',
      cinema: {
        id: 'cinema-1',
        code: 'CGV-1',
        name: 'Rạp Trung Tâm',
        latitude: '',
        longitude: '',
        address: '',
        phone: '',
        cityId: 'UNKNOWN',
        imageLandscape: '',
        imagePortrait: '',
        imageUrls: [],
        order: 0,
      },
    });

    expect(getShowtimeCityName(session)).toBe('Tỉnh / Thành phố chưa xác định');
  });

  it('resolves a province for every cinema in the seeded showtime snapshot', () => {
    const cityNames = new Set(seedSessions.map(getShowtimeCityName));

    expect(cityNames).not.toContain('Tỉnh / Thành phố chưa xác định');
  });
});
