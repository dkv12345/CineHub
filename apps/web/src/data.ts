export const avatar =
  'https://images.unsplash.com/photo-1615454138525-01a2abbf5437?auto=format&fit=crop&w=200&q=85';

export type Movie = {
  id: number | string;
  title: string;
  genre: string;
  duration: string;
  director: string;
  cast: string;
  age: string;
  rating: number;
  votes: number;
  poster: string;
  backdrop: string;
  status: 'now' | 'soon';
  release: string;
  synopsis: string;
  themeKey?: MovieThemeKey;
  country?: string;
  studio?: string;
  trailer?: string;
  views?: number;
  slug?: string;
  startDate?: string;
  endDate?: string;
};

export type MovieThemeKey =
  | 'space'
  | 'scarlet'
  | 'ocean'
  | 'noir'
  | 'earth'
  | 'ghibli'
  | 'conan'
  | 'doraemon'
  | 'western'
  | 'china'
  | 'korea';

export const movieThemes: Record<
  MovieThemeKey,
  { accent: string; highlight: string; wash: string; fontFamily: string }
> = {
  space: {
    accent: '#5d86c7',
    highlight: '#e0b968',
    wash: 'rgba(75, 115, 177, .13)',
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  scarlet: {
    accent: '#b94b56',
    highlight: '#edbb75',
    wash: 'rgba(185, 75, 86, .14)',
    fontFamily: "'Oswald', sans-serif",
  },
  ocean: {
    accent: '#3299b9',
    highlight: '#e4b768',
    wash: 'rgba(50, 153, 185, .14)',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  noir: {
    accent: '#7667a8',
    highlight: '#e1b95f',
    wash: 'rgba(118, 103, 168, .14)',
    fontFamily: "'DM Serif Display', serif",
  },
  earth: {
    accent: '#ad7953',
    highlight: '#d4a85e',
    wash: 'rgba(173, 121, 83, .13)',
    fontFamily: "'Cormorant Garamond', serif",
  },
  ghibli: {
    accent: '#548b60',
    highlight: '#dbb957',
    wash: 'rgba(84, 139, 96, .15)',
    fontFamily: "'Cormorant Garamond', serif",
  },
  conan: {
    accent: '#3867a8',
    highlight: '#c94d58',
    wash: 'rgba(56, 103, 168, .15)',
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  doraemon: {
    accent: '#309bbf',
    highlight: '#ef866d',
    wash: 'rgba(48, 155, 191, .15)',
    fontFamily: "'Fredoka', sans-serif",
  },
  western: {
    accent: '#a66b4e',
    highlight: '#d5b060',
    wash: 'rgba(166, 107, 78, .14)',
    fontFamily: "'Playfair Display', serif",
  },
  china: {
    accent: '#a94e48',
    highlight: '#c9a557',
    wash: 'rgba(169, 78, 72, .15)',
    fontFamily: "'Noto Serif SC', serif",
  },
  korea: {
    accent: '#a6537b',
    highlight: '#d5ae70',
    wash: 'rgba(166, 83, 123, .14)',
    fontFamily: "'Gowun Dodum', sans-serif",
  },
};

// Re-export mock data isolated in mocks/ for tests and mock fallback
export { movies, cinemas, combos, promotions, seedReviews } from './mocks/data.mock';

export const PRICE = {
  regular: 90000,
  vip: 115000,
  sweetbox: 220000,
  regularWeekend: 105000,
  vipWeekend: 130000,
  sweetboxWeekend: 240000,
};

export const fmt = (n: number) => n.toLocaleString('vi-VN') + ' đ';

const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const pad = (n: number) => String(n).padStart(2, '0');

export function dayInfo(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const short =
    offset === 0
      ? 'Hôm nay'
      : offset === 1
        ? 'Ngày mai'
        : WD[d.getDay()].replace('Thứ ', 'T').replace('Chủ nhật', 'CN');
  return {
    offset,
    short,
    num: pad(d.getDate()),
    label: `${WD[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
  };
}

export function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function getShows(movieId: number | string, cinemaIdx: number, dayOffset: number) {
  const numId = typeof movieId === 'number' ? movieId : hash(String(movieId));
  const seed = numId * 7 + cinemaIdx * 3 + dayOffset;
  const base = ['10:00', '13:15', '16:20', '19:45', '22:10'];
  const t2 = base.filter((_, i) => (i + seed) % 3 !== 0).map((time) => ({ time, format: '2D' }));
  const t3 = (seed % 2 === 0 ? ['18:00', '21:00'] : ['20:30']).map((time) => ({
    time,
    format: '3D',
  }));
  const imax = cinemaIdx % 2 === 0 ? [{ time: '17:30', format: 'IMAX' }] : [];
  return [...t2, ...t3, ...imax].sort((a, b) => a.time.localeCompare(b.time));
}

export interface AIRecommendation {
  movieId: string;
  title: string;
  rating: number;
  matchReason: string[];
  posterUrl?: string;
}
