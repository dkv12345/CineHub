import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Globe2, Play, Star, Ticket } from 'lucide-react';
import { movies } from '../data';
import type { Movie, MovieThemeKey } from '../data';
import { go, Link } from '../router';
import { useStore } from '../store';
import { Modal } from '../components/ui';
import { getYouTubeEmbedUrl } from '../services/sessionsApi';
import { fetchMovieById, fetchMovies } from '../services/moviesApi';

function toMovie(movie: Awaited<ReturnType<typeof fetchMovieById>>): Movie | null {
  if (!movie) return null;
  const duration = movie.durationMin;
  const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
  return {
    id: movie.id,
    title: movie.title,
    genre: movie.genre || movie.genres?.join(', ') || 'Điện ảnh',
    duration:
      movie.duration ||
      (duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : 'Đang cập nhật'),
    director: movie.director || movie.directors?.join(', ') || 'Đang cập nhật',
    cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast || 'Đang cập nhật',
    age: movie.ageRating || movie.age || 'T13',
    rating: movie.rating,
    votes: movie.ratingCount || movie.votes || 0,
    poster: movie.posterUrl || movie.poster || '',
    backdrop: movie.backdropUrl || movie.backdrop || movie.posterUrl || '',
    status: movie.status === 'now' || movie.status === 'NOW_SHOWING' ? 'now' : 'soon',
    release:
      movie.release ||
      (releaseDate
        ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(releaseDate)
        : 'Đang cập nhật'),
    synopsis: movie.synopsis || '',
    country: movie.country || undefined,
    trailer: movie.trailerUrl || movie.trailer || undefined,
    themeKey: (movie.themeKey as MovieThemeKey) || undefined,
  };
}

function getReleaseYear(movie: Movie): string {
  const date = movie.startDate || movie.release;
  return date?.match(/\b(19|20)\d{2}\b/)?.[0] || 'Đang cập nhật';
}

function getDurationInMinutes(duration: string): string {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m/i);
  if (hours || minutes) {
    return `${Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0)} phút`;
  }
  return duration || 'Đang cập nhật';
}

function normalizeGenre(genre: string): string {
  return genre
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi');
}

function getSimilarMovies(movie: Movie, pool: Movie[] = movies): Movie[] {
  const genres = new Set(movie.genre.split(',').map(normalizeGenre).filter(Boolean));
  if (!genres.size) return [];

  return pool
    .filter((candidate) => {
      if (String(candidate.id) === String(movie.id)) return false;
      return candidate.genre.split(',').some((genre) => genres.has(normalizeGenre(genre)));
    })
    .sort((a, b) => {
      const score = (candidate: Movie) =>
        candidate.genre
          .split(',')
          .map(normalizeGenre)
          .filter((genre) => genres.has(genre)).length;
      return score(b) - score(a) || b.rating - a.rating;
    })
    .slice(0, 5);
}

export default function MovieDetail({
  id,
  autoPlayTrailer = false,
}: {
  id: number | string;
  autoPlayTrailer?: boolean;
}) {
  const localMovie = movies.find((item) => String(item.id) === String(id));
  const [movie, setMovie] = useState<Movie | null>(localMovie || null);
  const [allMovies, setAllMovies] = useState<Movie[]>(movies);
  const [movieLoading, setMovieLoading] = useState(!localMovie);
  const [movieError, setMovieError] = useState('');
  const { notified, toggleNotify, trackMovie } = useStore();
  const [trailer, setTrailer] = useState(autoPlayTrailer);

  useEffect(() => {
    const controller = new AbortController();
    if (!localMovie) {
      setMovieLoading(true);
    }
    setMovieError('');

    // Fetch movie details directly from database API
    fetchMovieById(String(id), controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data) {
          setMovie(toMovie(data));
        } else if (!localMovie) {
          setMovieError('Không tìm thấy phim.');
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (!localMovie) {
          setMovieError(error instanceof Error ? error.message : 'Không thể tải thông tin phim.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setMovieLoading(false);
      });

    // Also fetch all movies from database API for recommendations
    fetchMovies(controller.signal).then((list) => {
      if (controller.signal.aborted) return;
      if (Array.isArray(list) && list.length > 0) {
        setAllMovies(list);
      }
    });

    return () => controller.abort();
  }, [id, localMovie]);

  useEffect(() => {
    trackMovie(id, 12);
  }, [id, trackMovie]);

  if (!movie) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-slate-950 px-5 text-center text-white">
        <div>
          <p style={{ color: '#ffffff' }}>
            {movieLoading ? 'Đang tải thông tin phim...' : movieError || 'Không tìm thấy phim.'}
          </p>
          <Link
            to="/home"
            className="mt-4 inline-flex font-bold text-amber-400 transition hover:text-amber-300"
            style={{ color: '#fbbf24' }}
          >
            Quay về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  const isComingSoon = movie.status === 'soon';
  const isNotified = notified.includes(movie.id);
  const genres = movie.genre
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);
  const castMembers = movie.cast
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== 'Đang cập nhật');
  const language = movie.country === 'Việt Nam' ? 'Tiếng Việt' : 'Phụ đề tiếng Việt';
  const durationLabel = getDurationInMinutes(movie.duration);
  const similarMovies = getSimilarMovies(movie, allMovies);

  const playTrailer = () => {
    trackMovie(movie.id, 34);
    setTrailer(true);
  };

  return (
    <main
      className="min-h-screen overflow-hidden bg-slate-950 text-white"
      style={{ backgroundColor: '#020617', color: '#ffffff' }}
    >
      {/* HERO BANNER SECTION */}
      <section className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-slate-950 sm:min-h-[600px]">
        {/* Ảnh Backdrop Landscape */}
        <img
          src={movie.backdrop || movie.poster}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-75"
        />
        {/* Ambient Blur Layer theo màu Poster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] scale-125 bg-cover bg-center opacity-30 blur-3xl mix-blend-screen"
          style={{ backgroundImage: `url("${movie.poster || movie.backdrop}")` }}
        />
        {/* Gradient Overlay phủ toàn bộ chiều cao */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"
        />

        {/* Đã tăng pb-28 md:pb-36 để không bị poster đè lên nút đánh giá */}
        <div className="relative z-20 mx-auto grid w-full max-w-[1440px] grid-cols-1 items-end gap-8 px-5 pb-28 pt-24 md:px-9 md:pb-36 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-4xl">
            <p
              className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[.28em] !text-amber-300 sm:text-sm"
              style={{ color: '#fcd34d' }}
            >
              <span className="h-px w-10 bg-amber-300" />
              {movie.country || 'Điện ảnh'}
            </p>
            <h1
              className="max-w-5xl text-3xl font-black tracking-wide !text-white md:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              style={{ color: '#ffffff' }}
            >
              {movie.title.toLocaleUpperCase('vi')}
            </h1>

            <div
              className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold !text-white sm:text-sm"
              style={{ color: '#ffffff' }}
            >
              <span
                className="inline-flex items-center gap-2 !text-white"
                style={{ color: '#ffffff' }}
              >
                <CalendarDays size={16} className="text-amber-300" style={{ color: '#fcd34d' }} />
                {getReleaseYear(movie)}
              </span>
              <span aria-hidden="true" style={{ color: '#ffffff' }}>
                |
              </span>
              <span style={{ color: '#ffffff' }}>Độ tuổi: {movie.age}</span>
              <span aria-hidden="true" style={{ color: '#ffffff' }}>
                |
              </span>
              <span
                className="inline-flex items-center gap-2 !text-white"
                style={{ color: '#ffffff' }}
              >
                <Clock3 size={16} className="text-amber-300" style={{ color: '#fcd34d' }} />
                Thời lượng: {durationLabel}
              </span>
              <span aria-hidden="true" style={{ color: '#ffffff' }}>
                |
              </span>
              <span
                className="inline-flex items-center gap-2 !text-white"
                style={{ color: '#ffffff' }}
              >
                <Globe2 size={16} className="text-amber-300" style={{ color: '#fcd34d' }} />
                {language}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <div
                className="grid h-[76px] w-[76px] place-items-center rounded-full border-2 border-amber-300 bg-black/70 shadow-[0_0_30px_rgba(251,191,36,.3)] backdrop-blur"
                aria-label={`Đánh giá ${movie.rating ? movie.rating.toFixed(1) : 'chưa có'}`}
              >
                <span className="flex flex-col items-center">
                  <span
                    className="flex items-center gap-1 text-base font-black !text-amber-300"
                    style={{ color: '#fcd34d' }}
                  >
                    <Star size={14} fill="currentColor" />{' '}
                    {movie.rating ? movie.rating.toFixed(1) : '—'}
                  </span>
                  <span
                    className="mt-0.5 text-[9px] font-bold uppercase tracking-wider !text-white"
                    style={{ color: '#ffffff' }}
                  >
                    Đánh giá
                  </span>
                </span>
              </div>
              {movie.votes > 0 && (
                <span className="text-xs font-semibold !text-white" style={{ color: '#ffffff' }}>
                  {movie.votes.toLocaleString('vi-VN')} lượt đánh giá
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={playTrailer}
            aria-label={`Xem trailer phim ${movie.title}`}
            className="hidden h-16 w-16 place-items-center rounded-full border-2 border-white bg-black/40 !text-white shadow-2xl backdrop-blur transition hover:scale-110 hover:border-amber-300 hover:bg-amber-400 hover:!text-black md:grid lg:mb-2"
            style={{ color: '#ffffff', borderColor: '#ffffff' }}
          >
            <Play size={26} fill="currentColor" className="ml-1" />
          </button>
        </div>
      </section>

      {/* DETAILED INFO SECTION */}
      <section className="relative z-10 mx-auto grid max-w-[1440px] gap-8 bg-slate-950 px-5 pb-12 pt-4 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12 md:px-9 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
        <div className="mx-auto -mt-16 w-full max-w-[280px] md:mx-0 md:-mt-24 md:max-w-none">
          <div className="overflow-hidden rounded-xl bg-slate-900 shadow-2xl shadow-black/90 ring-2 ring-white/20">
            <img
              src={movie.poster || movie.backdrop}
              alt={`Áp phích phim ${movie.title}`}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>
          <span
            className="mt-4 inline-flex rounded-md border border-amber-300/50 bg-amber-400/20 px-3.5 py-1.5 text-xs font-black tracking-wide !text-amber-300"
            style={{ color: '#fcd34d' }}
          >
            {movie.age}
          </span>
        </div>

        <div className="min-w-0 pt-1">
          <p
            className="text-xs font-extrabold uppercase tracking-[.25em] !text-amber-400"
            style={{ color: '#fbbf24' }}
          >
            THÔNG TIN PHIM
          </p>
          <h2
            className="mt-2 text-2xl font-black !text-white md:text-3xl"
            style={{ color: '#ffffff' }}
          >
            {movie.title}
          </h2>
          <p className="mt-4 text-base font-semibold !text-white" style={{ color: '#ffffff' }}>
            <span className="font-extrabold !text-amber-400" style={{ color: '#fbbf24' }}>
              Đạo diễn:
            </span>{' '}
            <span className="font-bold !text-white" style={{ color: '#ffffff' }}>
              {movie.director}
            </span>
          </p>

          <div className="mt-8">
            <h3
              className="mb-3 flex items-center gap-3 text-sm font-extrabold uppercase tracking-wide !text-amber-400"
              style={{ color: '#fbbf24' }}
            >
              <span aria-hidden="true" className="h-5 w-1 rounded-full bg-amber-400" />
              NỘI DUNG PHIM
            </h3>
            <p
              className="max-w-3xl whitespace-pre-line text-sm font-medium leading-relaxed !text-white sm:text-base"
              style={{ color: '#ffffff' }}
            >
              {movie.synopsis || 'Nội dung phim đang được cập nhật.'}
            </p>
          </div>

          <div className="mt-7">
            <h3
              className="mb-3 text-xs font-extrabold uppercase tracking-wide !text-amber-400"
              style={{ color: '#fbbf24' }}
            >
              THỂ LOẠI
            </h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/50 bg-white/10 px-4 py-1.5 text-sm font-bold !text-white backdrop-blur-md"
                  style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={playTrailer}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white bg-white/15 px-6 py-3 text-sm font-extrabold !text-white backdrop-blur-md transition hover:bg-white hover:!text-black shadow-lg"
              style={{ color: '#ffffff', borderColor: '#ffffff' }}
            >
              <Play size={18} fill="currentColor" /> Xem Trailer
            </button>
            {isComingSoon ? (
              <button
                type="button"
                onClick={() => toggleNotify(movie.id)}
                aria-pressed={isNotified}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold !text-white shadow-lg transition ${
                  isNotified ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-700'
                }`}
                style={{ color: '#ffffff' }}
              >
                {isNotified ? 'Đã đăng ký nhận tin' : 'Nhận thông báo'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(`/showtimes?movie=${movie.id}`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-7 py-3 text-sm font-extrabold !text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
                style={{ color: '#ffffff' }}
              >
                <Ticket size={18} /> Đặt Vé Ngay
              </button>
            )}
          </div>
          {isComingSoon && (
            <p className="mt-3 text-xs font-semibold !text-white" style={{ color: '#ffffff' }}>
              Khởi chiếu: {movie.release}. Đăng ký nhận tin để cập nhật lịch mở bán vé.
            </p>
          )}
        </div>
      </section>

      {/* CAST SECTION */}
      <section className="mx-auto max-w-[1440px] px-5 pb-16 md:px-9">
        <div className="border-t border-white/20 pt-8">
          <h2
            className="mb-5 flex items-center gap-3 text-sm font-extrabold uppercase tracking-wide !text-amber-400"
            style={{ color: '#fbbf24' }}
          >
            <span aria-hidden="true" className="h-6 w-1 rounded-full bg-amber-400" />
            DIỄN VIÊN
          </h2>
          {castMembers.length ? (
            <div className="flex flex-wrap gap-2.5">
              {castMembers.map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-slate-600 bg-slate-800/90 px-4 py-2 text-sm font-bold !text-white shadow transition hover:bg-slate-700"
                  style={{ color: '#ffffff', backgroundColor: '#1e293b', borderColor: '#475569' }}
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium !text-white" style={{ color: '#ffffff' }}>
              Thông tin diễn viên đang được cập nhật.
            </p>
          )}
        </div>
      </section>

      {/* SIMILAR MOVIES SECTION */}
      {similarMovies.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-9">
          <div className="border-t border-white/20 pt-8">
            <h2
              className="mb-5 text-xl font-extrabold !text-amber-400 tracking-wide"
              style={{ color: '#fbbf24' }}
            >
              PHIM CÙNG THỂ LOẠI
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {similarMovies.map((similarMovie) => (
                <Link
                  key={similarMovie.id}
                  to={`/movie/${similarMovie.id}`}
                  onClick={() => trackMovie(similarMovie.id)}
                  aria-label={`Xem chi tiết phim ${similarMovie.title}`}
                  className="group min-w-0"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900 shadow-xl ring-1 ring-white/10">
                    <img
                      src={similarMovie.poster || similarMovie.backdrop}
                      alt={`Áp phích phim ${similarMovie.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span
                      className="absolute left-2 top-2 rounded-md border border-white/20 bg-black/80 px-2 py-1 text-[10px] font-black !text-white backdrop-blur"
                      style={{ color: '#ffffff' }}
                    >
                      {similarMovie.age}
                    </span>
                    <span
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-amber-300/50 bg-black/80 px-2 py-1 text-[10px] font-black !text-amber-300 backdrop-blur"
                      style={{ color: '#fcd34d' }}
                    >
                      <Star size={11} fill="currentColor" />
                      {similarMovie.rating ? similarMovie.rating.toFixed(1) : '—'}
                    </span>
                  </div>
                  <p
                    className="mt-2.5 line-clamp-1 text-base font-extrabold !text-white transition group-hover:!text-amber-400"
                    style={{ color: '#ffffff' }}
                  >
                    {similarMovie.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRAILER MODAL */}
      {trailer && (
        <Modal wide onClose={() => setTrailer(false)}>
          <h2 className="mb-4 pr-8 text-lg font-extrabold !text-white" style={{ color: '#ffffff' }}>
            Trailer · {movie.title}
          </h2>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {movie.trailer && getYouTubeEmbedUrl(movie.trailer) ? (
              <iframe
                src={getYouTubeEmbedUrl(movie.trailer)!}
                title={`Trailer phim ${movie.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <>
                <img
                  src={movie.backdrop || movie.poster}
                  alt=""
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-red-600 pl-1 text-white">
                    <Play size={32} fill="currentColor" />
                  </span>
                </div>
                <p
                  className="absolute inset-x-4 bottom-5 text-center text-sm font-extrabold !text-white"
                  style={{ color: '#ffffff' }}
                >
                  Trailer phim đang được cập nhật.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
