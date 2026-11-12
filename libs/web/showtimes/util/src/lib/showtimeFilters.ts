export interface GalaxySessionMovie {
  id: string;
  dbId?: string;
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

export interface GalaxySessionCinema {
  id: string;
  dbId?: string;
  code: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  phone: string;
  cityId: string;
  cityCode?: string;
  cityName?: string;
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
  movieFormat: string;
  totalSeat: number;
  bookedSeat: number;
  caption: string;
  version: string;
  status?: 'SCHEDULED' | 'OPEN' | 'SOLD_OUT' | 'CANCELLED' | 'FINISHED' | string;
  movie: GalaxySessionMovie;
  cinema: GalaxySessionCinema;
}

export interface ShowtimeFilters {
  date?: string | null;
  movieId?: string | number | null;
  cityId?: string | null;
  cityName?: string | null;
  cinemaId?: string | null;
  format?: string | null;
  caption?: string | null;
  version?: string | null;
  searchQuery?: string;
}

const normalize = (value: string | number | null | undefined) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (letter) => (letter === 'Đ' ? 'D' : 'd'))
    .toLocaleLowerCase('vi');

const isActive = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && value !== '' && normalize(value) !== 'all';

const CITY_NAMES: Record<string, string> = {
  '599535ea-1ea2-4393-9b5a-3ba3a807f363': 'TP. Hồ Chí Minh',
  'f4bf5f53-4e80-40c8-b1e0-f11ffa9a636a': 'Hà Nội',
  '29ca9635-7ff0-44bf-8793-c97acba3f57a': 'Hải Phòng',
  '48def6c3-5254-4ece-b63c-e5524fda1296': 'Đà Nẵng',
  '34b721af-15ac-46f9-8d6b-54e86446d05f': 'Khánh Hòa',
  '3504c4df-cc0f-4356-a934-260cf5e9ca32': 'Vĩnh Long',
  '477b975e-caac-4149-8fcc-a10fbde8df84': 'Cà Mau',
  '8f4c8342-a17b-4951-a06d-8df6e6cf882f': 'Tây Ninh',
  '95ea07fe-5999-4030-bb5f-abe0440d96f0': 'Đắk Lắk',
  '356d6f3d-5cb6-4392-9abf-84aae78c6573': 'An Giang',
  'ae597899-e73a-42f2-b8a7-1a0ac5f29057': 'TP. Hồ Chí Minh',
  '52585552-cd12-445f-99bf-adeee11a7d99': 'Huế',
  '6c1d6ebc-dfc9-47ca-b0e9-2be7766f68d4': 'Nghệ An',
  HCM: 'TP. Hồ Chí Minh',
  HN: 'Hà Nội',
  DN: 'Đà Nẵng',
  HP: 'Hải Phòng',
  VL: 'Vĩnh Long',
  KH: 'Khánh Hòa',
  NA: 'Nghệ An',
  TN: 'Tây Ninh',
  TTH: 'Huế',
  AG: 'An Giang',
  DL: 'Đắk Lắk',
  CM: 'Cà Mau',
  DNA: 'Đồng Nai',
  BD: 'TP. Hồ Chí Minh',
  CT: 'Cần Thơ',
  QN: 'Quảng Ninh',
  TG: 'Đồng Tháp',
  KG: 'An Giang',
  GL: 'Gia Lai',
  BTR: 'Vĩnh Long',
  VT: 'TP. Hồ Chí Minh',
};

const ADDRESS_PROVINCES: ReadonlyArray<{ name: string; aliases: readonly string[] }> = [
  {
    name: 'TP. Hồ Chí Minh',
    aliases: [
      'TP. Hồ Chí Minh',
      'Thành phố Hồ Chí Minh',
      'TP.HCM',
      'HCM',
      'Sài Gòn',
      'Bình Dương',
      'Bà Rịa',
      'Vũng Tàu',
    ],
  },
  { name: 'Hà Nội', aliases: ['Hà Nội'] },
  { name: 'Đà Nẵng', aliases: ['Đà Nẵng'] },
  { name: 'Hải Phòng', aliases: ['Hải Phòng'] },
  { name: 'Huế', aliases: ['TP. Huế', 'TP.Huế', 'Thừa Thiên Huế', 'Huế'] },
  { name: 'Cần Thơ', aliases: ['Cần Thơ'] },
  { name: 'An Giang', aliases: ['An Giang', 'Kiên Giang', 'Rạch Giá'] },
  { name: 'Bắc Ninh', aliases: ['Bắc Ninh', 'Bắc Giang'] },
  { name: 'Cà Mau', aliases: ['Cà Mau', 'Bạc Liêu'] },
  { name: 'Cao Bằng', aliases: ['Cao Bằng'] },
  { name: 'Đắk Lắk', aliases: ['Đắk Lắk', 'Phú Yên', 'Buôn Ma Thuột'] },
  { name: 'Điện Biên', aliases: ['Điện Biên'] },
  { name: 'Đồng Nai', aliases: ['Đồng Nai', 'Bình Phước'] },
  { name: 'Đồng Tháp', aliases: ['Đồng Tháp', 'Tiền Giang', 'Mỹ Tho'] },
  { name: 'Gia Lai', aliases: ['Gia Lai', 'Bình Định', 'Quy Nhơn'] },
  { name: 'Hà Tĩnh', aliases: ['Hà Tĩnh'] },
  { name: 'Hưng Yên', aliases: ['Hưng Yên', 'Thái Bình'] },
  { name: 'Khánh Hòa', aliases: ['Khánh Hòa', 'Ninh Thuận', 'Nha Trang', 'Phan Rang'] },
  { name: 'Lai Châu', aliases: ['Lai Châu'] },
  {
    name: 'Lâm Đồng',
    aliases: ['Lâm Đồng', 'Đắk Nông', 'Bình Thuận', 'Đà Lạt', 'Phan Thiết'],
  },
  { name: 'Lạng Sơn', aliases: ['Lạng Sơn'] },
  { name: 'Lào Cai', aliases: ['Lào Cai', 'Yên Bái'] },
  { name: 'Nghệ An', aliases: ['Nghệ An'] },
  { name: 'Ninh Bình', aliases: ['Ninh Bình', 'Hà Nam', 'Nam Định'] },
  { name: 'Phú Thọ', aliases: ['Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình'] },
  { name: 'Quảng Ngãi', aliases: ['Quảng Ngãi', 'Kon Tum'] },
  { name: 'Quảng Ninh', aliases: ['Quảng Ninh', 'Hạ Long'] },
  { name: 'Quảng Trị', aliases: ['Quảng Trị', 'Quảng Bình', 'Đồng Hới'] },
  { name: 'Sơn La', aliases: ['Sơn La'] },
  { name: 'Tây Ninh', aliases: ['Tây Ninh', 'Long An', 'Tân An'] },
  { name: 'Thái Nguyên', aliases: ['Thái Nguyên'] },
  { name: 'Thanh Hóa', aliases: ['Thanh Hóa'] },
  { name: 'Tuyên Quang', aliases: ['Tuyên Quang', 'Hà Giang'] },
  { name: 'Vĩnh Long', aliases: ['Vĩnh Long', 'Bến Tre', 'Trà Vinh'] },
];

export function getCinemaCityKey(cinema: GalaxySession['cinema']): string {
  const cityCode = 'cityCode' in cinema ? cinema.cityCode : undefined;
  const cityName = 'cityName' in cinema ? cinema.cityName : undefined;
  return String(cinema.cityId || cityCode || cityName || '');
}

export function getShowtimeCityKey(session: GalaxySession): string {
  return getCinemaCityKey(session.cinema);
}

export function getShowtimeCityName(session: GalaxySession): string {
  const cinema = session.cinema;
  const cityKey = getShowtimeCityKey(session);
  const explicitName = 'cityName' in cinema ? cinema.cityName : undefined;
  const normalizedAddress = normalize(cinema.address);
  for (const province of ADDRESS_PROVINCES) {
    if (province.aliases.some((alias) => normalizedAddress.includes(normalize(alias)))) {
      return province.name;
    }
  }

  if (typeof explicitName === 'string' && explicitName.trim()) {
    const mappedExplicitName = ADDRESS_PROVINCES.find((province) =>
      province.aliases.some((alias) => normalize(alias) === normalize(explicitName)),
    );
    if (mappedExplicitName) return mappedExplicitName.name;
  }

  const mappedCityKey = ADDRESS_PROVINCES.find((province) =>
    province.aliases.some((alias) => normalize(alias) === normalize(cityKey)),
  );
  if (mappedCityKey) return mappedCityKey.name;

  const mappedName = CITY_NAMES[cityKey] || CITY_NAMES[cityKey.toUpperCase()];
  if (mappedName) return mappedName;

  return 'Tỉnh / Thành phố chưa xác định';
}

export function filterShowtimes(
  showtimes: GalaxySession[],
  filters: ShowtimeFilters,
): GalaxySession[] {
  const byDate = isActive(filters.date)
    ? showtimes.filter((session) => session.showDate.slice(0, 10) === filters.date!.slice(0, 10))
    : showtimes;

  const citySelector = filters.cityId || filters.cityName;
  const byCity = isActive(citySelector)
    ? byDate.filter((session) => {
        const cityKey = getShowtimeCityKey(session);
        const cityName = getShowtimeCityName(session);
        const cityCode = 'cityCode' in session.cinema ? session.cinema.cityCode : undefined;
        const explicitCityName = 'cityName' in session.cinema ? session.cinema.cityName : undefined;
        return (
          normalize(cityKey) === normalize(citySelector) ||
          normalize(cityCode) === normalize(citySelector) ||
          normalize(explicitCityName) === normalize(citySelector) ||
          normalize(cityName) === normalize(citySelector)
        );
      })
    : byDate;

  const byCinema = isActive(filters.cinemaId)
    ? byCity.filter((session) => {
        const target = normalize(filters.cinemaId);
        return (
          normalize(session.cinema.id) === target ||
          normalize(session.cinema.dbId) === target ||
          normalize(session.cinema.code) === target ||
          normalize(session.cinema.name) === target ||
          normalize(session.cinema.name).includes(target)
        );
      })
    : byCity;

  const byMovie = isActive(filters.movieId)
    ? byCinema.filter((session) => {
        const target = String(filters.movieId);
        const normTarget = normalize(target);
        return (
          String(session.movie.id) === target ||
          String(session.movie.dbId) === target ||
          session.movie.slug === target ||
          normalize(session.movie.id) === normTarget ||
          normalize(session.movie.dbId) === normTarget ||
          normalize(session.movie.slug) === normTarget ||
          normalize(session.movie.name) === normTarget ||
          normalize(session.movie.name).includes(normTarget)
        );
      })
    : byCinema;

  const byFormat = isActive(filters.format)
    ? byMovie.filter((session) => normalize(session.movieFormat) === normalize(filters.format))
    : byMovie;

  const byCaption = isActive(filters.caption)
    ? byFormat.filter((session) => normalize(session.caption) === normalize(filters.caption))
    : byFormat;

  const byVersion = isActive(filters.version)
    ? byCaption.filter((session) => normalize(session.version) === normalize(filters.version))
    : byCaption;

  const query = normalize(filters.searchQuery);
  if (!query) return byVersion;

  return byVersion.filter((session) =>
    [
      session.movie.name,
      session.movie.slug,
      session.cinema.name,
      session.cinema.address,
      session.screenName,
    ].some((value) => normalize(value).includes(query)),
  );
}
