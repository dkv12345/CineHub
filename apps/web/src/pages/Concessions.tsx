import { useEffect, useState } from 'react';
import { fmt, movies } from '../data';
import { go } from '../router';
import { combosTotal, ticketsTotal, useStore } from '../store';
import { HoldTimer, Icon } from '../components/ui';
import { fetchConcessions } from '../services/concessionsApi';

const STEPS = ['Chọn ghế', 'Bắp nước', 'Thanh toán'];

// Component Steps trực tiếp với tông màu #ffffff và #fcd34d
function CustomSteps({ current }: { current: number }) {
  return (
    <nav aria-label="Tiến trình đặt vé" className="flex items-center gap-2 text-xs font-black">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all ${
                isActive
                  ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'border-white/20 bg-slate-900/60'
              }`}
              style={{
                color: isActive ? '#fcd34d' : '#ffffff',
                borderColor: isActive ? '#fcd34d' : 'rgba(255, 255, 255, 0.25)',
                opacity: !isActive && !isDone ? 0.7 : 1,
              }}
            >
              <span
                className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-black"
                style={{
                  backgroundColor: isActive ? '#fcd34d' : 'rgba(255, 255, 255, 0.2)',
                  color: isActive ? '#000000' : '#ffffff',
                }}
              >
                {stepNum}
              </span>
              <span style={{ color: isActive ? '#fcd34d' : '#ffffff' }}>{label}</span>
            </div>

            {idx < STEPS.length - 1 && (
              <span
                className="h-0.5 w-4 rounded-full"
                style={{
                  backgroundColor: isDone ? '#fcd34d' : 'rgba(255, 255, 255, 0.2)',
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function Concessions() {
  const { booking, patch, concessions, setConcessions } = useStore();
  const movie = movies.find((v) => String(v.id) === String(booking.movieId));
  const m = movie || {
    id: booking.movieId || 1,
    title: booking.movieTitle || 'Phim',
    backdrop: booking.moviePoster || '',
    poster: booking.moviePoster || '',
    age: booking.movieAge || 'T13',
    genre: 'Hành động, Phiêu lưu',
    duration: String(booking.movieDuration || 120),
    rating: 8.5,
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    fetchConcessions(booking.cinemaCode, controller.signal)
      .then((items) => {
        if (active) setConcessions(items);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách bắp nước.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [booking.cinemaCode, reload, setConcessions]);

  const qty = (id: string) => booking.combos[id] || 0;
  const set = (id: string, n: number) =>
    patch({ combos: { ...booking.combos, [id]: Math.max(0, Math.min(10, n)) } });

  const tickets = ticketsTotal(booking);
  const food = combosTotal(booking, concessions);

  const invalidSelection = concessions.some(
    (item) =>
      qty(item.id) > 0 &&
      (booking.seats.length < item.minSeats || booking.seats.length > item.maxSeats),
  );

  return (
    <main className="relative min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <HoldTimer />

      {/* 1. Background Poster Phủ Tràn Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {m.backdrop && (
          <img
            src={m.backdrop}
            alt=""
            className="h-full w-full object-cover object-center opacity-100 blur-[0.5px] scale-105"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]" />
      </div>

      {/* 2. Nội dung chính UI Bắp nước */}
      <div className="relative z-10 mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        {/* Nút quay lại & Tiến trình thanh toán */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => go('/booking/seats')}
            className="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125"
            style={{ color: '#fcd34d' }}
          >
            <Icon name="back" size={16} /> Quay lại chọn ghế
          </button>
          <div className="w-full sm:w-auto">
            <CustomSteps current={2} />
          </div>
        </div>

        {/* Bố cục 2 Cột */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Cột trái: Danh sách combo bắp nước */}
          <div className="flex flex-col gap-6">
            {/* Header Phim */}
            <div className="max-w-[800px]">
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="text-3xl font-black tracking-tight sm:text-4xl"
                  style={{ color: '#ffffff' }}
                >
                  {m.title.toUpperCase()}
                </h1>
                <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-black">
                  IMDb {m.rating}/10
                </span>
                <span
                  className="rounded border border-amber-300/80 bg-amber-400/20 px-2 py-0.5 text-xs font-black"
                  style={{ color: '#fcd34d' }}
                >
                  {m.age}
                </span>
                <span className="text-xs font-extrabold" style={{ color: '#ffffff' }}>
                  {m.duration} PHÚT | {m.genre.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Thanh Thông Tin Rạp Chiếu & Lưu Ý */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/20 bg-slate-950/20 p-4 shadow-xl backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-xs font-black uppercase">
                  <span className="block text-[10px]" style={{ color: '#fcd34d' }}>
                    Rạp chiếu
                  </span>
                  <span style={{ color: '#ffffff' }}>{booking.cinema}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="text-xs font-black uppercase">
                  <span className="block text-[10px]" style={{ color: '#fcd34d' }}>
                    Suất chiếu
                  </span>
                  <span style={{ color: '#ffffff' }}>
                    {booking.time}, {booking.dateLabel}
                  </span>
                </div>
              </div>

              <p className="text-xs font-bold" style={{ color: '#fcd34d' }}>
                🍿 Đặt trước bắp nước nhận ngay tại quầy, không lo xếp hàng!
              </p>
            </div>

            {/* Trạng thái Loading / Error / Empty */}
            {loading && (
              <p className="mt-4 text-sm font-bold" style={{ color: '#ffffff' }}>
                Đang tải danh sách bắp nước từ rạp...
              </p>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 backdrop-blur-md">
                <p role="alert" className="text-sm font-bold text-red-200">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setReload((value) => value + 1)}
                  className="mt-3 text-xs font-black text-white underline underline-offset-4 hover:text-amber-300"
                >
                  Thử tải lại
                </button>
              </div>
            )}

            {!loading && !error && concessions.length === 0 && (
              <p className="mt-4 text-sm font-bold" style={{ color: '#ffffff' }}>
                Rạp chưa có sản phẩm bắp nước cho suất chiếu này.
              </p>
            )}

            {/* Danh Sách Sản Phẩm Bắp Nước */}
            {!loading && !error && concessions.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {concessions.map((c) => {
                  const eligible =
                    booking.seats.length >= c.minSeats && booking.seats.length <= c.maxSeats;
                  const selectedQty = qty(c.id);

                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition ${
                        selectedQty
                          ? 'border-amber-400/80 bg-slate-950/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                          : 'border-white/20 bg-slate-950/20 hover:border-white/40'
                      }`}
                    >
                      {/* Hình ảnh sản phẩm */}
                      <div
                        className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 bg-slate-900/80"
                        aria-hidden="true"
                      >
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon
                            name={
                              c.category === 'DRINK'
                                ? 'drink'
                                : c.category === 'SNACK'
                                  ? 'snack'
                                  : 'popcorn'
                            }
                            size={32}
                          />
                        )}
                      </div>

                      {/* Chi tiết sản phẩm & Bộ tăng giảm số lượng */}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-black" style={{ color: '#ffffff' }}>
                          {c.name}
                        </h2>
                        <p
                          className="mt-1 text-xs font-semibold leading-relaxed opacity-80"
                          style={{ color: '#ffffff' }}
                        >
                          {c.description || c.category}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <b
                            className="text-sm font-black tabular-nums"
                            style={{ color: '#fcd34d' }}
                          >
                            {fmt(c.price)}
                          </b>

                          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/80 p-1">
                            <button
                              type="button"
                              onClick={() => set(c.id, selectedQty - 1)}
                              disabled={!selectedQty}
                              aria-label={`Giảm ${c.name}`}
                              className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/20 disabled:opacity-30"
                              style={{ color: '#ffffff' }}
                            >
                              <Icon name="minus" size={14} />
                            </button>
                            <span
                              className="w-6 text-center text-xs font-black tabular-nums"
                              style={{ color: '#ffffff' }}
                              aria-live="polite"
                            >
                              {selectedQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => set(c.id, selectedQty + 1)}
                              disabled={!eligible}
                              aria-label={`Tăng ${c.name}`}
                              className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-r from-red-600 to-amber-500 shadow-md transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ color: '#ffffff' }}
                            >
                              <Icon name="plus" size={14} />
                            </button>
                          </div>
                        </div>

                        {!eligible && (
                          <p className="mt-2 text-[11px] font-bold" style={{ color: '#fcd34d' }}>
                            Yêu cầu từ {c.minSeats} đến {c.maxSeats} ghế
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {invalidSelection && (
              <p role="alert" className="text-sm font-bold" style={{ color: '#fcd34d' }}>
                ⚠️ Số lượng ghế đã thay đổi không còn phù hợp với combo đã chọn. Vui lòng điều chỉnh
                lại combo hoặc chọn lại ghế.
              </p>
            )}
          </div>

          {/* Cột phải Sidebar: Poster, Tóm tắt vé & Tổng tiền */}
          <aside className="sticky top-6 flex flex-col gap-5 rounded-3xl border border-white/20 bg-slate-950/25 p-6 shadow-2xl backdrop-blur-xl">
            {/* Poster Phim */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-white/20">
              {m.poster && (
                <img
                  src={m.poster}
                  alt={m.title}
                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <div
                className="flex items-center justify-between text-xs font-black uppercase tracking-wider"
                style={{ color: '#fcd34d' }}
              >
                <span>Tóm tắt đơn hàng</span>
              </div>

              {/* Ghế đã chọn */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span style={{ color: '#ffffff' }}>Vé phim ({booking.seats.length} ghế):</span>
                <span style={{ color: '#fcd34d' }}>{fmt(tickets)}</span>
              </div>

              {booking.seats.length > 0 && (
                <p
                  className="text-[11px] font-semibold opacity-80 truncate"
                  style={{ color: '#ffffff' }}
                >
                  Danh sách ghế: <b style={{ color: '#fcd34d' }}>{booking.seats.join(', ')}</b>
                </p>
              )}

              {/* Combo bắp nước đã chọn */}
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span style={{ color: '#ffffff' }}>Bắp nước:</span>
                  <span style={{ color: '#fcd34d' }}>{fmt(food)}</span>
                </div>

                {concessions.filter((c) => qty(c.id) > 0).length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {concessions
                      .filter((c) => qty(c.id) > 0)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-[11px] font-bold"
                        >
                          <span style={{ color: '#ffffff' }}>
                            {c.name} <b style={{ color: '#fcd34d' }}>x{qty(c.id)}</b>
                          </span>
                          <span style={{ color: '#fcd34d' }}>{fmt(c.price * qty(c.id))}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tổng tiền & Nút Tiếp tục */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-end justify-between">
                <span
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: '#fcd34d' }}
                >
                  Tổng cộng
                </span>
                <span className="text-2xl font-black tabular-nums" style={{ color: '#fcd34d' }}>
                  {fmt(tickets + food)}
                </span>
              </div>

              <button
                type="button"
                disabled={invalidSelection}
                onClick={() => go('/booking/checkout')}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: '#ffffff' }}
              >
                {food ? 'Tiếp tục thanh toán' : 'Bỏ qua & Tiếp tục'} <Icon name="arrow" size={17} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
