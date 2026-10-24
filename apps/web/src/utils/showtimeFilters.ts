import type { GalaxySession } from '../services/sessionsApi';

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
    .toLocaleLowerCase('vi');

const isActive = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && value !== '' && normalize(value) !== 'all';

const CITY_NAMES: Record<string, string> = {
  '599535ea-1ea2-4393-9b5a-3ba3a807f363': 'TP. Hồ Chí Minh',
  'f4bf5f53-4e80-40c8-b1e0-f11ffa9a636a': 'Hà Nội',
  '29ca9635-7ff0-44bf-8793-c97acba3f57a': 'Hải Phòng',
  '48def6c3-5254-4ece-b63c-e5524fda1296': 'Đà Nẵng',
  '34b721af-15ac-46f9-8d6b-54e86446d05f': 'Khánh Hòa',
  '3504c4df-cc0f-4356-a934-260cf5e9ca32': 'Bến Tre',
  '477b975e-caac-4149-8fcc-a10fbde8df84': 'Cà Mau',
  '8f4c8342-a17b-4951-a06d-8df6e6cf882f': 'Tây Ninh',
  '95ea07fe-5999-4030-bb5f-abe0440d96f0': 'Đắk Lắk',
  '356d6f3d-5cb6-4392-9abf-84aae78c6573': 'An Giang',
  'ae597899-e73a-42f2-b8a7-1a0ac5f29057': 'Bà Rịa - Vũng Tàu',
  '52585552-cd12-445f-99bf-adeee11a7d99': 'Thừa Thiên Huế',
  '6c1d6ebc-dfc9-47ca-b0e9-2be7766f68d4': 'Nghệ An',
};

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
  const mappedName = CITY_NAMES[cityKey];
  if (mappedName) return mappedName;

  const explicitName = 'cityName' in cinema ? cinema.cityName : undefined;
  if (typeof explicitName === 'string' && explicitName.trim()) return explicitName.trim();

  const addressCity = cinema.address.match(/(?:Tỉnh|TP\.?|Thành phố)\s*([^,\n]+)/i)?.[1]?.trim();
  if (addressCity) return addressCity;

  return cityKey && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(cityKey)
    ? cityKey
    : cinema.name;
}

export function filterShowtimes(
  showtimes: GalaxySession[],
  filters: ShowtimeFilters,
): GalaxySession[] {
  // Keep the cascade aligned with the page controls: date -> city -> cinema -> movie -> format.
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
    ? byCity.filter(
        (session) =>
          normalize(session.cinema.id) === normalize(filters.cinemaId) ||
          normalize(session.cinema.code) === normalize(filters.cinemaId),
      )
    : byCity;

  const byMovie = isActive(filters.movieId)
    ? byCinema.filter((session) => String(session.movie.id) === String(filters.movieId))
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
