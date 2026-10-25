import { useEffect, useMemo, useState } from 'react';
import { cinemas, dayInfo, movies, movieThemes, promotions } from '../data';
import type { Movie } from '../data';
import type { CSSProperties } from 'react';
import { go, Link } from '../router';
import { Icon } from '../components/ui';
import { useStore } from '../store';
import type { MovieRecommendation } from '../services/recommendationsApi';
import { fetchRecommendations } from '../services/recommendationsApi';
import { fetchMovies } from '../services/moviesApi';

function Hero() {
  // 1. Lọc chỉ lấy các slide Banner / Quảng cáo (loại bỏ slide Phim)
  const bannerSlides = useMemo(
    () =>
      promotions.map((promotion) => ({
        type: 'promotion' as const,
        key: promotion.id,
        promotion,
      })),
    [],
  );

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || bannerSlides.length === 0) return;
    const t = setInterval(() => setI((x) => (x + 1) % bannerSlides.length), 6000);
    return () => clearInterval(t);
  }, [paused, bannerSlides.length]);

  const step = (d: number) => setI((x) => (x + d + bannerSlides.length) % bannerSlides.length);

  if (bannerSlides.length === 0) return null;
  return (
    <section
      className="relative mx-auto min-h-[350px] sm:min-h-[480px] md:min-h-[600px] max-w-[1600px] overflow-hidden bg-[#020617] text-[#fff]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banner chương trình ưu đãi"
    >
      {/* Hiển thị danh sách Banner */}
      {bannerSlides.map((slide, n) => (
        <div
          key={slide.key}
          aria-hidden={n !== i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            n === i ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="absolute inset-0 overflow-hidden bg-[#020617]">
            <img
              src={slide.promotion?.image || (slide as any).image}
              alt={slide.promotion?.title || (slide as any).title || 'Banner'}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      ))}

      {/* Nút điều hướng Slide Trước / Sau & Chấm tròn chọn trang */}
      <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3 md:bottom-8 md:right-9">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Slide trước"
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-950 text-[#fff] shadow-lg backdrop-blur transition hover:border-amber-300 hover:bg-amber-400 hover:text-black"
        >
          <Icon name="chevronL" size={18} />
        </button>

        <div className="flex gap-2">
          {bannerSlides.map((slide, n) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1}`}
              className={`h-2 rounded-full transition-all ${
                n === i ? 'w-8 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)]' : 'w-3 bg-white'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Slide sau"
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-950 text-[#fff] shadow-lg backdrop-blur transition hover:border-amber-300 hover:bg-amber-400 hover:text-black"
        >
          <Icon name="chevron" size={18} />
        </button>
      </div>
    </section>
  );
}

const labelClass = 'min-w-0 text-xs font-black uppercase tracking-wider text-amber-300';
const selectClass =
  'block w-full appearance-none rounded-xl border-2 border-white/80 bg-slate-950 py-3 pl-3.5 pr-10 text-sm font-black text-[#fff] outline-none transition [color-scheme:dark] [-webkit-text-fill-color:#fff] hover:border-white focus:border-amber-300 focus:ring-2 focus:ring-amber-400/40 disabled:cursor-not-allowed disabled:border-white/60 disabled:text-[#fff] disabled:opacity-100';
const optionClass = 'bg-slate-900 font-black text-[#fff]';

function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#fff]"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function QuickBooking({ movies: propMovies }: { movies: Movie[] }) {
  const showings = propMovies.filter((m) => m.status === 'now');
  const days = Array.from({ length: 7 }, (_, i) => dayInfo(i));
  const [movieId, setMovieId] = useState(() => String(showings[0]?.id || ''));
  const [day, setDay] = useState(0);
  const [cinemaId, setCinemaId] = useState(cinemas[0].id);

  useEffect(() => {
    if (showings.length > 0 && !showings.some((m) => String(m.id) === movieId)) {
      setMovieId(String(showings[0].id));
    }
  }, [showings, movieId]);

  return (
    <section
      className="grid gap-3 rounded-2xl border-2 border-white/40 bg-slate-900 p-4 shadow-2xl shadow-black/90 ring-1 ring-white/20 backdrop-blur-2xl md:grid-cols-[1.15fr_1.15fr_.8fr_.8fr_auto] md:items-end md:p-5"
      aria-label="Đặt vé nhanh"
    >
      <label className={labelClass}>
        Chọn phim
        <div className="relative mt-2">
          <select
            value={movieId}
            onChange={(e) => setMovieId(e.target.value)}
            className={selectClass}
          >
            {showings.map((m) => (
              <option key={m.id} value={m.id} className={optionClass}>
                {m.title}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>
      <label className={labelClass}>
        Chọn rạp
        <div className="relative mt-2">
          <select
            value={cinemaId}
            onChange={(e) => setCinemaId(e.target.value)}
            className={selectClass}
          >
            {cinemas.map((c) => (
              <option key={c.id} value={c.id} className={optionClass}>
                {c.name}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>
      <label className={labelClass}>
        Chọn ngày
        <div className="relative mt-2">
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className={selectClass}
          >
            {days.map((d, i) => (
              <option key={d.offset} value={i} className={optionClass}>
                {d.short} · {d.num}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </label>
      <label className={labelClass}>
        Chọn suất
        <div className="relative mt-2">
          <select
            value=""
            disabled
            aria-label="Suất chiếu sẽ khả dụng sau khi kết nối dữ liệu suất chiếu"
            className={selectClass}
          >
            <option value="" className={optionClass}>
              Chọn phim, rạp và ngày trước
            </option>
          </select>
          <SelectChevron />
        </div>
      </label>
      <button
        onClick={() => go(`/showtimes?movie=${movieId}&day=${day}&cinema=${cinemaId}`)}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-6 py-3.5 text-sm font-black text-[#fff] shadow-xl shadow-red-900/50 transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 md:w-auto"
      >
        <Icon name="ticket" size={17} /> Mua vé nhanh
      </button>
    </section>
  );
}

function Card({
  m,
  favorite,
  onFavorite,
  onOpen,
}: {
  m: Movie;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  const now = m.status === 'now';
  const theme = movieThemes[m.themeKey || 'space'];
  const themeStyle = {
    '--film-accent': theme.accent,
    '--film-highlight': theme.highlight,
    '--film-display': theme.fontFamily,
  } as CSSProperties;
  return (
    <article
      className="group overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-xl transition hover:border-amber-400"
      style={themeStyle}
    >
      <div className="relative">
        <Link
          to={`/movie/${m.id}`}
          onClick={onOpen}
          className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20"
        >
          <img
            src={m.poster}
            alt={`Poster ${m.title}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />
          {m.studio && (
            <span className="absolute left-3 top-3 max-w-[72%] truncate rounded-full border border-white/40 bg-slate-950/90 px-2.5 py-1 text-[9px] font-black text-[#fff] backdrop-blur">
              {m.studio}
            </span>
          )}
          <span className="absolute bottom-3 left-3 rounded-md border border-amber-300 bg-amber-400/30 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow-lg">
            {m.age}
          </span>
          {m.rating > 0 && (
            <span className="absolute bottom-3 right-3 rounded-full border border-amber-300 bg-slate-950/95 px-2.5 py-1 text-[10px] font-black text-amber-300 backdrop-blur">
              ⭐ {m.rating.toFixed(1)}
            </span>
          )}
        </Link>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/90 opacity-0 backdrop-blur-[3px] transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => go(now ? `/showtimes?movie=${m.id}` : `/movie/${m.id}`)}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-5 py-3 text-sm font-black text-[#fff] shadow-lg transition hover:brightness-125"
          >
            <Icon name="ticket" size={17} /> {now ? 'Mua vé' : 'Xem phim'}
          </button>
          <button
            type="button"
            onClick={() => go(`/movie/${m.id}?trailer=1`)}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl border-2 border-white bg-black/70 px-5 py-3 text-sm font-black text-[#fff] backdrop-blur transition hover:bg-white hover:text-black"
          >
            <Icon name="play" size={17} /> Trailer
          </button>
        </div>
        <button
          type="button"
          onClick={onFavorite}
          aria-label={favorite ? `Bỏ yêu thích ${m.title}` : `Yêu thích ${m.title}`}
          aria-pressed={favorite}
          className={`absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border-2 bg-slate-950/90 backdrop-blur transition hover:scale-105 ${favorite ? 'border-red-500 text-red-500' : 'border-white text-[#fff]'}`}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="pt-4">
        <Link
          to={`/movie/${m.id}`}
          onClick={onOpen}
          className="block truncate text-sm font-black text-[#fff] transition hover:text-amber-300 group-hover:text-amber-300"
        >
          {m.title}
        </Link>
        <p className="mt-1 truncate text-xs font-bold text-amber-300">{m.genre}</p>
        {!now && <p className="mt-2 text-[11px] font-black text-amber-400">{m.release}</p>}
      </div>
    </article>
  );
}

export default function Home() {
  const [tab, setTab] = useState<'now' | 'soon'>('now');
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [shelf, setShelf] = useState<'history' | 'collection' | 'trending'>('history');
  const [allMovies, setAllMovies] = useState<Movie[]>(movies);

  useEffect(() => {
    let active = true;
    fetchMovies().then((data) => {
      if (active && Array.isArray(data) && data.length > 0) {
        setAllMovies(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const { user, collections, toggleCollection, recentMovies, watchProgress, trackMovie } =
    useStore();
  const [recommended, setRecommended] = useState<MovieRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');

  useEffect(() => {
    if (!user) {
      setRecommended([]);
      setRecommendationsLoading(false);
      setRecommendationsError('');
      return;
    }
    const controller = new AbortController();
    setRecommendationsLoading(true);
    setRecommendationsError('');
    fetchRecommendations(recentMovies, collections, controller.signal)
      .then(setRecommended)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRecommendationsError(
          cause instanceof Error ? cause.message : 'Không thể tải gợi ý phim.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecommendationsLoading(false);
      });
    return () => controller.abort();
  }, [collections, recentMovies, user]);

  const filterOptions = [
    ['all', 'Tất cả'],
    ['ghibli', 'Studio Ghibli'],
    ['conan', 'Conan'],
    ['doraemon', 'Doraemon'],
    ['western', 'US / UK'],
    ['china', 'Trung Quốc'],
    ['korea', 'Hàn Quốc'],
  ];

  const matchesCatalog = (m: Movie) =>
    catalogFilter === 'all' ||
    (catalogFilter === 'ghibli' && m.studio === 'Studio Ghibli') ||
    (catalogFilter === 'conan' && m.studio === 'Detective Conan') ||
    (catalogFilter === 'doraemon' && m.studio === 'Doraemon') ||
    (catalogFilter === 'western' && ['Mỹ', 'Anh'].includes(m.country || '')) ||
    (catalogFilter === 'china' && m.country === 'Trung Quốc') ||
    (catalogFilter === 'korea' && m.country === 'Hàn Quốc');
  const list = allMovies.filter((m) => m.status === tab && matchesCatalog(m));
  const trending = [...allMovies]
    .filter((m) => m.status === 'now')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);
  const popularPreview = trending.slice(0, 3);
  const shelfMovies =
    shelf === 'collection'
      ? collections
      : shelf === 'history'
        ? recentMovies
        : trending.map((m) => m.id);
  const shelfItems = shelfMovies
    .map((id) => allMovies.find((m) => m.id === id))
    .filter((m): m is Movie => !!m);

  return (
    <main className="min-h-screen bg-[#020617] text-[#fff] selection:bg-amber-400 selection:text-black">
      {/* 1. Banner Hero hiển thị trọn vẹn 100% */}
      <Hero />

      {/* 2. Thanh QuickBooking nằm tách biệt hoàn toàn bên dưới Hero, không che đè */}
      <div className="relative z-10 mx-auto mt-6 max-w-[1400px] px-5 md:mt-8 md:px-9">
        <QuickBooking movies={allMovies} />
      </div>

      {/* 3. Section Top Thịnh Hành */}
      <section className="mx-auto max-w-[1400px] px-5 pt-10 md:px-9 md:pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              Được khán giả lựa chọn
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff]">Top thịnh hành</h2>
          </div>
          <Link
            to="/showtimes"
            className="text-xs font-black text-amber-300 transition hover:text-amber-200"
          >
            Xem lịch chiếu <Icon name="chevron" size={14} />
          </Link>
        </div>

        {/* pl-12 md:pl-14 tạo khoảng trống lề trái cho số 1 nhô hoàn toàn ra ngoài khung */}
        <div className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 pl-12 pr-6 md:-mx-9 md:pl-14 md:pr-9">
          {trending.map((m, i) => (
            <Link
              key={m.id}
              to={`/movie/${m.id}`}
              onClick={() => trackMovie(m.id)}
              style={
                {
                  '--film-accent': movieThemes[m.themeKey || 'space'].accent,
                  '--film-highlight': movieThemes[m.themeKey || 'space'].highlight,
                } as CSSProperties
              }
              className="group relative w-[190px] shrink-0 snap-start rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 pt-3 shadow-xl transition hover:border-amber-400 sm:w-[220px]"
            >
              {/* Số 3D nhô hẳn ra ngoài khung (-left-7) */}
              <span
                className={`display absolute -left-7 bottom-10 z-20 font-black leading-none text-amber-300 drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)] transition-all duration-300 group-hover:scale-110 group-hover:text-amber-400 ${
                  i >= 9 ? 'text-[100px] tracking-tighter' : 'text-[108px]'
                }`}
              >
                {i + 1}
              </span>
              <div className="ml-9 overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20">
                <img
                  src={m.poster}
                  alt={`Poster ${m.title}`}
                  className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <span className="mt-3 block truncate pl-9 text-sm font-black text-[#fff] transition hover:text-amber-300 group-hover:text-amber-300">
                {m.title}
              </span>
              <span className="block pl-9 text-xs font-black text-amber-300">
                ★ {m.rating} · {m.country || 'Quốc tế'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 border-y-2 border-white/20 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-10 md:grid-cols-[.8fr_2fr] md:items-center md:px-9">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
              <Icon name="sparkles" size={16} /> CineHub AI
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff]">Dành riêng cho bạn</h2>
            <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-[#fff]">
              {user
                ? `Gợi ý theo phim bạn đã xem và lưu, ${user.name}.`
                : 'Khám phá những bộ phim hợp gu của bạn.'}
            </p>
            {!user && (
              <Link
                to={`/login?next=${encodeURIComponent('/home')}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-amber-400 transition hover:text-amber-300"
              >
                Đăng nhập để nhận gợi ý chuẩn gu <Icon name="arrow" size={16} />
              </Link>
            )}
          </div>
          {user ? (
            <div>
              {recommendationsLoading && (
                <p className="text-sm font-black text-[#fff]">Đang tìm phim hợp gu...</p>
              )}
              {recommendationsError && (
                <p role="alert" className="text-sm font-black text-rose-300">
                  {recommendationsError}
                </p>
              )}
              {!recommendationsLoading && !recommendationsError && recommended.length === 0 && (
                <p className="text-sm font-bold text-[#fff]">
                  Chưa có đủ lịch sử để cá nhân hoá; đây là những phim đang được quan tâm.
                </p>
              )}
              <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(recommended.length ? recommended : popularPreview).map((m) => {
                  const movieId = 'matchReason' in m ? m.id : m.id;
                  const title = m.title;
                  const poster = 'matchReason' in m ? m.posterUrl : m.poster;
                  const reason =
                    'matchReason' in m
                      ? m.matchReason
                      : `${m.genre.split(',')[0]} · Đang được yêu thích`;
                  const age = 'matchReason' in m ? m.ageRating : m.age;
                  return (
                    <Link
                      key={movieId}
                      to={`/movie/${movieId}`}
                      onClick={() => trackMovie(movieId)}
                      className="group flex min-w-0 gap-3 rounded-2xl border-2 border-slate-700 bg-slate-900 p-3 shadow-md transition hover:border-amber-400 hover:bg-slate-800"
                    >
                      {poster ? (
                        <img
                          src={poster}
                          alt={`Poster ${title}`}
                          className="h-28 w-[74px] shrink-0 rounded-lg object-cover shadow-md ring-1 ring-white/20"
                        />
                      ) : (
                        <div className="grid h-28 w-[74px] shrink-0 place-items-center rounded-lg bg-slate-800">
                          <Icon name="film" />
                        </div>
                      )}
                      <div className="min-w-0 py-1">
                        <h3 className="line-clamp-2 text-sm font-black text-[#fff] transition hover:text-amber-300 group-hover:text-amber-300">
                          {title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-amber-300">
                          {reason}
                        </p>
                        <p className="mt-2 text-[11px] font-black text-[#fff]">
                          {age || 'Phim chiếu rạp'}
                        </p>
                        <span className="mt-3 inline-flex items-center text-xs font-black text-amber-300">
                          Xem phim <Icon name="chevron" size={13} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {popularPreview.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full border-2 border-white/60 bg-slate-800 px-3.5 py-1.5 text-xs font-black text-[#fff] shadow-sm"
                >
                  {m.genre.split(',')[0]}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-5 px-5 py-14 md:px-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[auto_auto]">
        <aside className="h-fit rounded-2xl border-2 border-slate-700 bg-slate-900 p-3 shadow-xl backdrop-blur-md lg:col-start-1 lg:row-start-2">
          <p className="px-3 pb-3 pt-2 text-[11px] font-black uppercase tracking-widest text-amber-300">
            THƯ VIỆN CỦA BẠN
          </p>
          {(
            [
              ['history', 'Lịch sử / Xem tiếp', 'clock'],
              ['collection', 'Bộ sưu tập', 'heart'],
              ['trending', 'Đang thịnh hành', 'sparkles'],
            ] as const
          ).map(([key, title, icon]) => (
            <button
              key={key}
              onClick={() => setShelf(key)}
              aria-pressed={shelf === key}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                shelf === key
                  ? 'border-2 border-amber-400 bg-amber-400/20 font-black text-amber-300 shadow-md'
                  : 'border-2 border-white/40 bg-slate-800 font-black text-[#fff] shadow-md hover:bg-slate-700 hover:text-amber-300'
              }`}
            >
              <Icon name={icon} size={17} />
              {title}
              {key === 'collection' && (
                <span className="ml-auto text-xs font-black text-amber-300">
                  {collections.length}
                </span>
              )}
            </button>
          ))}
        </aside>
        <div className="min-w-0 lg:contents">
          <div className="mb-5 flex items-end justify-between gap-4 lg:col-start-2 lg:row-start-1">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                CineHub của bạn
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#fff]">
                {shelf === 'history'
                  ? 'Xem tiếp'
                  : shelf === 'collection'
                    ? 'Bộ sưu tập của tôi'
                    : 'People also liked'}
              </h2>
            </div>
            <span className="text-xs font-black text-[#fff]">{shelfItems.length} phim</span>
          </div>
          {shelfItems.length ? (
            <div className="scrollbar-hide -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-3 lg:col-start-2 lg:row-start-2">
              {shelfItems.map((m) => (
                <article
                  key={m.id}
                  className="group w-[150px] shrink-0 snap-start overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-lg backdrop-blur sm:w-[170px]"
                >
                  <Link
                    to={`/movie/${m.id}`}
                    onClick={() => trackMovie(m.id)}
                    className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20"
                  >
                    <img
                      src={m.poster}
                      alt={`Poster ${m.title}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute right-2 top-2 rounded-full border border-amber-300 bg-slate-950/95 px-2 py-1 text-[10px] font-black text-amber-300 backdrop-blur">
                      ★ {m.rating || 'Mới'}
                    </span>
                    {shelf === 'history' && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-slate-800">
                        <span
                          className="block h-full bg-red-600 transition-all"
                          style={{ width: `${watchProgress[m.id] || 8}%` }}
                        />
                      </span>
                    )}
                  </Link>
                  <h3 className="mt-3 truncate px-1 text-xs font-black text-[#fff] transition hover:text-amber-300 group-hover:text-amber-300">
                    {m.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between px-1 pb-1 text-[10px] font-bold text-amber-300">
                    <span>
                      {shelf === 'history'
                        ? `${watchProgress[m.id] || 8}% đã xem`
                        : m.genre.split(',')[0]}
                    </span>
                    <button
                      onClick={() => toggleCollection(m.id)}
                      aria-label={
                        collections.includes(m.id) ? `Bỏ lưu ${m.title}` : `Lưu ${m.title}`
                      }
                      className={collections.includes(m.id) ? 'text-red-500' : 'hover:text-[#fff]'}
                    >
                      <Icon name="heart" size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-start justify-center rounded-2xl border-2 border-slate-700 bg-slate-900 px-6 py-8 shadow-xl backdrop-blur-md lg:col-start-2 lg:row-start-2">
              <p className="text-sm font-extrabold text-[#fff]">
                {shelf === 'collection' ? 'Bộ sưu tập đang trống' : 'Chưa có hoạt động gần đây'}
              </p>
              <p className="mt-2 max-w-lg text-xs font-bold leading-5 text-amber-300">
                {shelf === 'collection'
                  ? 'Lưu phim yêu thích từ poster để xem lại tại đây.'
                  : 'Mở chi tiết phim hoặc xem trailer để tiếp tục theo dõi từ đây.'}
              </p>
              <button
                onClick={() => setShelf('trending')}
                className="mt-4 text-xs font-black text-amber-400 hover:text-amber-300"
              >
                Khám phá phim <Icon name="arrow" size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-9">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="h-7 w-1 rounded-full bg-amber-400" />
          <h2 className="text-xl font-black uppercase tracking-wide text-[#fff]">PHIM</h2>
        </div>
        <div role="tablist" className="mb-8 flex gap-8 border-b-2 border-white/20">
          {(
            [
              ['now', 'Đang chiếu'],
              ['soon', 'Sắp chiếu'],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-[3px] pb-4 text-lg transition ${
                tab === k
                  ? 'border-amber-400 font-black text-amber-300'
                  : 'border-transparent font-black text-[#fff] hover:text-amber-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          className="scrollbar-hide mb-7 flex gap-2 overflow-x-auto pb-2"
          aria-label="Lọc theo quốc gia hoặc studio"
        >
          {filterOptions.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCatalogFilter(key)}
              aria-pressed={catalogFilter === key}
              className={`shrink-0 rounded-full border-2 px-4 py-2 text-xs font-black transition ${
                catalogFilter === key
                  ? 'border-amber-300 bg-amber-400 font-black text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'border-white/60 bg-slate-800 text-[#fff] shadow-md hover:border-amber-300 hover:bg-slate-700 hover:text-amber-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((m) => (
            <Card
              key={m.id}
              m={m}
              favorite={collections.includes(m.id)}
              onFavorite={() => toggleCollection(m.id)}
              onOpen={() => trackMovie(m.id)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-14 md:px-9">
        <div className="flex flex-col gap-5 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/50 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">
              Ưu đãi thành viên
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff]">Một vé hay, thêm một niềm vui</h2>
            <p className="mt-2 text-sm font-extrabold text-[#fff]">
              Nhập mã <b className="font-black text-amber-300">CINEHUB20</b> để nhận ưu đãi 20.000₫
              cho vé tiếp theo.
            </p>
          </div>
          <button
            onClick={() => go('/showtimes')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-7 py-3.5 text-sm font-black text-[#fff] shadow-xl shadow-red-900/50 transition hover:brightness-125"
          >
            Khám phá suất chiếu <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>
    </main>
  );
}
