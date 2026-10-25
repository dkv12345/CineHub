import { Icon } from './ui';

export interface FilterCountOption {
  value: string;
  label: string;
  count: number;
}

interface ShowtimeFilterBarProps {
  movies: FilterCountOption[];
  selectedMovie: string;
  onMovieChange: (movieId: string) => void;
  cities: FilterCountOption[];
  selectedCity: string;
  onCityChange: (cityId: string) => void;
  cinemas: FilterCountOption[];
  selectedCinema: string;
  onCinemaChange: (cinemaId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  formats: FilterCountOption[];
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  captions: FilterCountOption[];
  selectedCaption: string;
  onCaptionChange: (caption: string) => void;
  versions: FilterCountOption[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
  viewMode: 'cinema' | 'movie';
  onViewModeChange: (viewMode: 'cinema' | 'movie') => void;
}

const selectClass =
  'glass-control w-full rounded-xl px-3.5 py-3 text-sm font-semibold outline-none transition focus:border-[#e50914]';

const pillClass = (selected: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
    selected
      ? 'film-accent-bg text-white shadow-[0_2px_12px_rgba(229,9,20,0.2)]'
      : 'border-white/12 bg-white/[.04] text-white/65 hover:border-white/30 hover:bg-white/[.08]'
  }`;

function FilterPills({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterCountOption[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</p>
      <div
        className="scrollbar-hide flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected === option.value}
            className={pillClass(selected === option.value)}
          >
            {option.label}
            <span className="ml-1 text-[10px] opacity-60">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShowtimeFilterBar({
  movies,
  selectedMovie,
  onMovieChange,
  cities,
  selectedCity,
  onCityChange,
  cinemas,
  selectedCinema,
  onCinemaChange,
  searchQuery,
  onSearchChange,
  formats,
  selectedFormat,
  onFormatChange,
  captions,
  selectedCaption,
  onCaptionChange,
  versions,
  selectedVersion,
  onVersionChange,
  viewMode,
  onViewModeChange,
}: ShowtimeFilterBarProps) {
  return (
    <section
      className="glass-panel mt-6 rounded-2xl p-4 shadow-xl sm:p-5"
      aria-label="Bộ lọc suất chiếu"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold text-white/55">Phim</span>
          <select
            value={selectedMovie}
            onChange={(event) => onMovieChange(event.target.value)}
            className={selectClass}
          >
            {movies.map((movie) => (
              <option key={movie.value} value={movie.value}>
                {movie.label} ({movie.count})
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold text-white/55">
            Thành phố / Khu vực
          </span>
          <select
            value={selectedCity}
            onChange={(event) => onCityChange(event.target.value)}
            className={selectClass}
          >
            {cities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label} ({city.count})
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold text-white/55">Cụm rạp</span>
          <select
            value={selectedCinema}
            onChange={(event) => onCinemaChange(event.target.value)}
            className={selectClass}
          >
            {cinemas.map((cinema) => (
              <option key={cinema.value} value={cinema.value}>
                {cinema.label} ({cinema.count})
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold text-white/55">Tìm nhanh</span>
          <span className="relative block">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tên phim, rạp, phòng..."
              className={`${selectClass} pl-9 pr-9 placeholder:font-medium placeholder:text-white/35`}
            />
            <span className="pointer-events-none absolute left-3 top-3.5 text-white/40">
              <Icon name="search" size={16} />
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-3.5 text-white/45 hover:text-white"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FilterPills
            label="Định dạng"
            options={formats}
            selected={selectedFormat}
            onChange={onFormatChange}
          />
          <FilterPills
            label="Phiên bản"
            options={versions}
            selected={selectedVersion}
            onChange={onVersionChange}
          />
          <FilterPills
            label="Âm thanh"
            options={captions}
            selected={selectedCaption}
            onChange={onCaptionChange}
          />
        </div>

        <div className="flex w-fit items-center gap-1 rounded-xl border border-white/12 bg-white/[.03] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => onViewModeChange('cinema')}
            aria-pressed={viewMode === 'cinema'}
            className={`rounded-lg px-3 py-2 transition ${
              viewMode === 'cinema' ? 'film-accent-bg text-white' : 'text-white/55 hover:text-white'
            }`}
          >
            Theo cụm rạp
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('movie')}
            aria-pressed={viewMode === 'movie'}
            className={`rounded-lg px-3 py-2 transition ${
              viewMode === 'movie' ? 'film-accent-bg text-white' : 'text-white/55 hover:text-white'
            }`}
          >
            Theo phim
          </button>
        </div>
      </div>
    </section>
  );
}
