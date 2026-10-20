export interface GalaxyMovie {
  id: string;
  name: string;
  age: string;
  duration: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  imageLandscape: string;
  imagePortrait: string;
  slug: string;
  trailer: string;
  rate: number;
  totalVotes: number;
  views: number;
  order: number;
}

export interface GalaxyCinema {
  id: string;
  code: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  phone: string;
  cityId: string;
  imageLandscape: string;
  imagePortrait: string;
  imageUrls: string[];
  order: number;
}

export interface GalaxySession {
  id: string;
  showDate: string;
  showTime: string;
  screenName: string;
  totalSeat: number;
  bookedSeat: number;
  caption: 'voice' | 'sub' | string;
  version: '2d' | '3d' | 'imax' | string;
  movieFormat: string;
  movie: GalaxyMovie;
  cinema: GalaxyCinema;
}

export interface GalaxyApiResponse {
  response: {
    status: number;
    code: number;
    message: string;
    url: string;
  };
  data: {
    total: number;
    result: GalaxySession[];
  };
}

export const CITY_MAP: Record<string, { name: string; region: string }> = {
  '599535ea-1ea2-4393-9b5a-3ba3a807f363': {
    name: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
  },
  'f4bf5f53-4e80-40c8-b1e0-f11ffa9a636a': {
    name: 'Hà Nội',
    region: 'Miền Bắc',
  },
  '48def6c3-5254-4ece-b63c-e5524fda1296': {
    name: 'Đà Nẵng',
    region: 'Miền Trung',
  },
  '3504c4df-cc0f-4356-a934-260cf5e9ca32': {
    name: 'Bến Tre',
    region: 'Miền Tây',
  },
  '477b975e-caac-4149-8fcc-a10fbde8df84': {
    name: 'Cà Mau',
    region: 'Miền Tây',
  },
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
    name: 'Hải Phòng',
    region: 'Miền Bắc',
  },
  'b2c3d4e5-f6a7-8901-bcde-f12345678901': {
    name: 'Cần Thơ',
    region: 'Miền Tây',
  },
  'c3d4e5f6-a7b8-9012-cdef-123456789012': {
    name: 'Khánh Hòa',
    region: 'Miền Trung',
  },
  'd4e5f6a7-b8c9-0123-def1-234567890123': {
    name: 'Nghệ An',
    region: 'Miền Trung',
  },
  'e5f6a7b8-c9d0-1234-ef12-345678901234': {
    name: 'Tây Ninh',
    region: 'Miền Nam',
  },
  'f6a7b8c9-d0e1-2345-f123-456789012345': {
    name: 'Thừa Thiên Huế',
    region: 'Miền Trung',
  },
  'a7b8c9d0-e1f2-3456-1234-567890123456': {
    name: 'An Giang',
    region: 'Miền Tây',
  },
  'b8c9d0e1-f2a3-4567-2345-678901234567': {
    name: 'Đắk Lắk',
    region: 'Tây Nguyên',
  },
  'c9d0e1f2-a3b4-5678-3456-789012345678': {
    name: 'Vĩnh Long',
    region: 'Miền Tây',
  },
};

/**
 * Fetches showtimes sessions.
 *
 * Mode 1: If `VITE_USE_MOCKS=true`, loads offline mock data from `mocks/sessions.mock`.
 * Mode 2: Real API call to `/api/sessions`.
 * Fallback: If network/server error occurs, automatically falls back to mock data.
 */
export async function fetchGalaxySessions(): Promise<GalaxyApiResponse> {
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  if (useMocks) {
    const { rawGalaxyApiResponse } = await import('../mocks/sessions.mock');
    return rawGalaxyApiResponse;
  }

  try {
    const response = await fetch('/api/sessions');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data: GalaxyApiResponse = await response.json();
    return data;
  } catch (error) {
    console.warn('API /api/sessions unavailable, falling back to mock sessions:', error);
    const { rawGalaxyApiResponse } = await import('../mocks/sessions.mock');
    return rawGalaxyApiResponse;
  }
}

export function getDistinctCities(
  sessions: GalaxySession[],
): { id: string; name: string; region: string; count: number }[] {
  const cityCount = new Map<string, number>();
  sessions.forEach((s) => {
    const cityId = s.cinema.cityId;
    if (cityId) cityCount.set(cityId, (cityCount.get(cityId) || 0) + 1);
  });
  return Array.from(cityCount.entries()).map(([id, count]) => {
    const info = CITY_MAP[id] || { name: 'Khu vực khác', region: 'Toàn quốc' };
    return { id, name: info.name, region: info.region, count };
  });
}

export function getDistinctCinemas(sessions: GalaxySession[]): GalaxyCinema[] {
  const map = new Map<string, GalaxyCinema>();
  sessions.forEach((s) => {
    if (!map.has(s.cinema.code)) map.set(s.cinema.code, s.cinema);
  });
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export function getDistinctMovies(sessions: GalaxySession[]): GalaxyMovie[] {
  const map = new Map<string, GalaxyMovie>();
  sessions.forEach((s) => {
    if (!map.has(s.movie.id)) map.set(s.movie.id, s.movie);
  });
  return Array.from(map.values()).sort((a, b) => b.rate - a.rate);
}

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match ? 'https://www.youtube.com/embed/' + match[1] + '?autoplay=1&rel=0' : url;
}
