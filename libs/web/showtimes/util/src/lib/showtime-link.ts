export interface ShowtimeMovieRef {
  readonly id: string | number;
  readonly slug?: string;
}

export interface ShowtimeLinkOptions {
  readonly date?: string;
  readonly cinemaId?: string;
  readonly day?: number;
}

export type ShowtimeQueryParams = Readonly<Record<string, string>>;

export function vietnamDate(offsetDays = 0): string {
  const dayOffset = Number.isFinite(offsetDays) ? Math.trunc(offsetDays) : 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
  const date = new Date(`${today}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function buildShowtimesLink(
  movie?: ShowtimeMovieRef | string | number | null,
  options: ShowtimeLinkOptions = {},
): string {
  const queryParams = buildShowtimesQueryParams(movie, options);
  const params = new URLSearchParams(queryParams);
  const query = params.toString();
  return query ? `/showtimes?${query}` : '/showtimes';
}

export function buildShowtimesQueryParams(
  movie?: ShowtimeMovieRef | string | number | null,
  options: ShowtimeLinkOptions = {},
): ShowtimeQueryParams {
  const params: Record<string, string> = {};
  const movieId =
    typeof movie === 'object' && movie !== null
      ? String(movie.id || movie.slug)
      : movie === null || movie === undefined
        ? ''
        : String(movie);

  if (movieId) params['movie'] = movieId;
  const date = options.date ?? (options.day === undefined ? undefined : vietnamDate(options.day));
  if (date) params['date'] = date;
  if (options.cinemaId) params['cinema'] = options.cinemaId;
  return params;
}
