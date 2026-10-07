import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const jsonPath = path.join(rootDir, 'data/seed/galaxy_normalized_v3.json');

if (!fs.existsSync(jsonPath)) {
  console.error('[ERROR] Data file not found:', jsonPath);
  process.exit(1);
}

const rawData = fs.readFileSync(jsonPath, 'utf-8');
const d = JSON.parse(rawData);

// 1. Genres map
const movieGenresMap = {};
for (const mg of d.movieGenres) {
  if (!movieGenresMap[mg.movieExternalId]) movieGenresMap[mg.movieExternalId] = [];
  const g = d.genres.find((x) => x.slug === mg.genreSlug);
  if (g) movieGenresMap[mg.movieExternalId].push(g.name);
}

// 2. Credits map
const movieDirectorsMap = {};
const movieCastsMap = {};
for (const mc of d.movieCredits) {
  const p = d.persons.find((x) => x.nameNormalized === mc.personNameNormalized);
  const name = p ? p.fullName : mc.personNameNormalized;
  if (mc.role === 'DIRECTOR') {
    if (!movieDirectorsMap[mc.movieExternalId]) movieDirectorsMap[mc.movieExternalId] = [];
    movieDirectorsMap[mc.movieExternalId].push(name);
  } else {
    if (!movieCastsMap[mc.movieExternalId]) movieCastsMap[mc.movieExternalId] = [];
    movieCastsMap[mc.movieExternalId].push(name);
  }
}

// 3. Source map
const movieSourceMap = {};
for (const ms of d.movieSources) {
  movieSourceMap[ms.movieExternalId] = ms;
}

function getThemeKey(title, genres) {
  const g = (genres || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (t.includes('conan') || t.includes('trinh thám')) return 'conan';
  if (t.includes('doraemon') || t.includes('mèo mang mũ')) return 'doraemon';
  if (
    t.includes('suzume') ||
    t.includes('totoro') ||
    t.includes('ghibli') ||
    t.includes('shaun the sheep')
  )
    return 'ghibli';
  if (
    t.includes('avengers') ||
    t.includes('dune') ||
    t.includes('godzilla') ||
    g.includes('viễn tưởng') ||
    g.includes('giả tưởng') ||
    t.includes('street fighter')
  )
    return 'space';
  if (
    g.includes('kinh dị') ||
    g.includes('quỷ') ||
    g.includes('vùng đất quỷ dữ') ||
    t.includes('hung tàn') ||
    t.includes('trấn yểm')
  )
    return 'noir';
  if (
    g.includes('hành động') ||
    g.includes('tội phạm') ||
    g.includes('giật gân') ||
    t.includes('trại buôn người')
  )
    return 'scarlet';
  if (
    g.includes('hài') ||
    g.includes('phiêu lưu') ||
    t.includes('quyết cua') ||
    t.includes('lên hương')
  )
    return 'western';
  if (
    t.includes('chung quỳ') ||
    t.includes('thần sư') ||
    t.includes('loạn thế') ||
    g.includes('võ hiệp') ||
    g.includes('cổ trang')
  )
    return 'china';
  if (t.includes('bts') || t.includes('lalisa') || g.includes('ca nhạc')) return 'korea';
  if (
    g.includes('tâm lý') ||
    g.includes('gia đình') ||
    g.includes('lãng mạn') ||
    g.includes('tình cảm')
  )
    return 'earth';
  return 'ocean';
}

function formatDuration(min) {
  if (!min) return '1h 45m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`;
}

function formatReleaseDate(dStr) {
  if (!dStr) return 'Đang chiếu';
  const parts = dStr.slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
}

const moviesList = d.movies.map((m, idx) => {
  const genresStr = (movieGenresMap[m.externalId] || ['Hành động', 'Kịch tính']).join(', ');
  const directorStr = (movieDirectorsMap[m.externalId] || ['Đang cập nhật']).join(', ');
  const castStr = (movieCastsMap[m.externalId] || ['Đang cập nhật']).slice(0, 5).join(', ');
  const source = movieSourceMap[m.externalId];
  const rating = source?.sourceScore ? Number(source.sourceScore) : 8.2 + (idx % 15) * 0.1;
  const votes = source?.sourceVotes ? Number(source.sourceVotes) : 100 + ((idx * 37) % 800);
  const views = votes * 8 + idx * 133;
  const themeKey = getThemeKey(m.title, genresStr);
  const isNow = m.status === 'NOW_SHOWING';

  return {
    id: m.externalId,
    title: m.title,
    genre: genresStr,
    duration: formatDuration(m.durationMin),
    director: directorStr,
    cast: castStr,
    age: m.ageRating || 'T13',
    rating: Number(rating.toFixed(1)),
    votes: votes,
    views: views,
    poster:
      m.posterUrl ||
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&auto=format&fit=crop&q=80',
    backdrop:
      m.backdropUrl ||
      m.posterUrl ||
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1800&auto=format&fit=crop&q=80',
    status: isNow ? 'now' : 'soon',
    release: formatReleaseDate(m.releaseDate),
    startDate: m.releaseDate ? `${m.releaseDate} 00:00:00` : '2026-10-01 00:00:00',
    endDate: m.endDate ? `${m.endDate} 00:00:00` : '2026-11-30 00:00:00',
    slug: m.slug,
    trailer: m.trailerUrl || 'https://www.youtube.com/watch?v=NSrioJtAiEU',
    themeKey: themeKey,
    country: m.country || 'Việt Nam',
    synopsis:
      m.synopsis ||
      'Bộ phim hấp dẫn mang đến những trải nghiệm điện ảnh đặc sắc tại các phòng chiếu hiện đại của CineHub.',
  };
});

const provincesMap = {};
for (const p of d.provinces) {
  provincesMap[p.code] = p.name;
}

const cinemasList = d.cinemas.map((c, idx) => {
  const provName = provincesMap[c.provinceCode] || 'TP. Hồ Chí Minh';
  const wardName = c.wardName || 'Trung tâm';
  return {
    id: c.externalId,
    brand: 'Galaxy',
    name: c.name,
    area: `${wardName} · ${provName}`,
    dist: `${(idx * 0.7 + 1.2).toFixed(1)} km`.replace('.', ','),
    code: c.externalId,
    address: c.address,
    phone: c.phone || '19002224',
    cityId: c.sourceCityId,
    imageUrl: c.imageUrl,
    thumbnailUrl: c.thumbnailUrl,
    galleryUrls: c.galleryUrls || [],
  };
});

// Write apps/web/src/data.ts
const dataTs = `export const avatar = 'https://images.unsplash.com/photo-1615454138525-01a2abbf5437?auto=format&fit=crop&w=200&q=85';

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

export const movies: Movie[] = ${JSON.stringify(moviesList, null, 2)};

export const cinemas = ${JSON.stringify(cinemasList, null, 2)};

export const combos = [
  {
    id: 'single',
    icon: 'popcorn',
    name: 'Combo Solo Classic',
    desc: '1 Bắp ngọt lớn (64oz) + 1 Nước ngọt có ga (32oz)',
    price: 85000,
  },
  {
    id: 'couple',
    icon: 'drink',
    name: 'Combo Couple Sweet',
    desc: '1 Bắp phô mai/caramel lớn + 2 Nước ngọt (32oz)',
    price: 120000,
  },
  {
    id: 'vip',
    icon: 'sparkles',
    name: 'Combo CineHub VIP Gold',
    desc: '1 Bắp mix 2 vị + 2 Nước ép trái cây + 1 Snack khoai tây cao cấp',
    price: 165000,
  },
  {
    id: 'family',
    icon: 'gift',
    name: 'Combo Family Party',
    desc: '2 Bắp lớn tự chọn vị + 4 Nước ngọt + 2 Xúc xích nướng',
    price: 240000,
  },
];

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
    label: \`\${WD[d.getDay()]}, \${pad(d.getDate())}/\${pad(d.getMonth() + 1)}\`,
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

export const seedReviews = [
  {
    name: 'Minh Anh',
    stars: 5,
    text: 'Hình ảnh và âm thanh quá đỉnh, xem tại CineHub rất đã. Đoạn kết rất xúc động.',
    when: '2 ngày trước',
  },
  {
    name: 'Quốc Bảo',
    stars: 5,
    text: 'Kịch bản chặt chẽ, diễn xuất tốt. Rạp ghế VIP ngồi cực kỳ êm ái.',
    when: '4 ngày trước',
  },
  {
    name: 'Thu Hà',
    stars: 4,
    text: 'Nhạc phim hay, đặt vé chọn ghế trực quan 3D POV rất tiện lợi.',
    when: '1 tuần trước',
  },
];

export interface AIRecommendation {
  movieId: string;
  title: string;
  rating: number;
  matchReason: string[];
  posterUrl?: string;
}
`;

fs.writeFileSync(path.join(rootDir, 'apps/web/src/data.ts'), dataTs, 'utf-8');
console.log('[SUCCESS] Generated apps/web/src/data.ts with 43 movies & 31 cinemas');

// Map sessions for sessionsApi.ts
const movieMapByExt = new Map(d.movies.map((m) => [m.externalId, m]));
const cinemaMapByExt = new Map(d.cinemas.map((c) => [c.externalId, c]));

const sessionsList = d.showtimes.map((s, idx) => {
  const m = movieMapByExt.get(s.movieExternalId) || d.movies[0];
  const c = cinemaMapByExt.get(s.cinemaExternalId) || d.cinemas[0];

  const date = new Date(s.startTime);
  const hours = String((date.getUTCHours() + 7) % 24).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const showTime = `${hours}:${minutes}`;

  const totalSeat = 120 + ((idx * 13) % 70);
  const bookedSeat = Math.floor(totalSeat * (0.15 + ((idx * 17) % 45) / 100));

  return {
    id: s.externalId,
    showDate: s.localDate,
    showTime: showTime,
    screenName: s.auditoriumName,
    totalSeat: totalSeat,
    bookedSeat: bookedSeat,
    caption: s.captionMode === 'DUBBED' ? 'voice' : 'sub',
    version: s.versionCode || '2d',
    movieFormat: s.formatRaw || '2D Phụ Đề',
    movie: {
      id: m.externalId,
      name: m.title,
      age: (m.ageRating || '13').replace('T', ''),
      duration: m.durationMin || 115,
      startDate: m.releaseDate ? `${m.releaseDate} 00:00:00` : '2026-10-01 00:00:00',
      endDate: m.endDate ? `${m.endDate} 00:00:00` : '2026-11-30 00:00:00',
      createdAt: '2026-09-24 15:00:00',
      imageLandscape: m.backdropUrl || m.posterUrl,
      imagePortrait: m.posterUrl,
      slug: m.slug,
      trailer: m.trailerUrl || 'https://www.youtube.com/watch?v=NSrioJtAiEU',
      rate: movieSourceMap[m.externalId]?.sourceScore
        ? Number(movieSourceMap[m.externalId].sourceScore)
        : 8.5,
      totalVotes: movieSourceMap[m.externalId]?.sourceVotes || 250,
      views: 1800,
      order: idx,
    },
    cinema: {
      id: c.externalId,
      code: c.externalId,
      name: c.name,
      latitude: String(c.latitude || '10.773390'),
      longitude: String(c.longitude || '106.693290'),
      address: c.address,
      phone: c.phone || '1900 2224',
      cityId: c.sourceCityId,
      imageLandscape: c.imageUrl,
      imagePortrait: c.thumbnailUrl,
      imageUrls: c.galleryUrls || [],
      order: c.sortOrder || 0,
    },
  };
});

const cityMapData = {
  '599535ea-1ea2-4393-9b5a-3ba3a807f363': { name: 'TP. Hồ Chí Minh', region: 'Miền Nam' },
  'f4bf5f53-4e80-40c8-b1e0-f11ffa9a636a': { name: 'Hà Nội', region: 'Miền Bắc' },
  '48def6c3-5254-4ece-b63c-e5524fda1296': { name: 'Đà Nẵng', region: 'Miền Trung' },
  '3504c4df-cc0f-4356-a934-260cf5e9ca32': { name: 'Bến Tre', region: 'Miền Tây' },
  '477b975e-caac-4149-8fcc-a10fbde8df84': { name: 'Cà Mau', region: 'Miền Tây' },
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': { name: 'Hải Phòng', region: 'Miền Bắc' },
  'b2c3d4e5-f6a7-8901-bcde-f12345678901': { name: 'Cần Thơ', region: 'Miền Tây' },
  'c3d4e5f6-a7b8-9012-cdef-123456789012': { name: 'Khánh Hòa', region: 'Miền Trung' },
  'd4e5f6a7-b8c9-0123-def1-234567890123': { name: 'Nghệ An', region: 'Miền Trung' },
  'e5f6a7b8-c9d0-1234-ef12-345678901234': { name: 'Tây Ninh', region: 'Miền Nam' },
  'f6a7b8c9-d0e1-2345-f123-456789012345': { name: 'Thừa Thiên Huế', region: 'Miền Trung' },
  'a7b8c9d0-e1f2-3456-1234-567890123456': { name: 'An Giang', region: 'Miền Tây' },
  'b8c9d0e1-f2a3-4567-2345-678901234567': { name: 'Đắk Lắk', region: 'Tây Nguyên' },
  'c9d0e1f2-a3b4-5678-3456-789012345678': { name: 'Vĩnh Long', region: 'Miền Tây' },
};

const sessionsApiTs = `export interface GalaxyMovie {
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

export const CITY_MAP: Record<string, { name: string; region: string }> = ${JSON.stringify(cityMapData, null, 2)};

export const rawGalaxyApiResponse: GalaxyApiResponse = {
  response: {
    status: 200,
    code: 0,
    message: 'OK',
    url: 'https://www.galaxycine.vn/api/v2/mobile/sessions2?includeCinema=true&includeMovie=true',
  },
  data: {
    total: ${sessionsList.length},
    result: ${JSON.stringify(sessionsList, null, 2)},
  },
};

export async function fetchGalaxySessions(): Promise<GalaxyApiResponse> {
  return rawGalaxyApiResponse;
}

export function getDistinctCities(sessions: GalaxySession[]): { id: string; name: string; region: string; count: number }[] {
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
  const match = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))([\\w-]{11})/);
  return match ? 'https://www.youtube.com/embed/' + match[1] + '?autoplay=1&rel=0' : url;
}
`;

fs.writeFileSync(
  path.join(rootDir, 'apps/web/src/services/sessionsApi.ts'),
  sessionsApiTs,
  'utf-8',
);
console.log(
  '[SUCCESS] Generated apps/web/src/services/sessionsApi.ts with',
  sessionsList.length,
  'real showtimes!',
);
