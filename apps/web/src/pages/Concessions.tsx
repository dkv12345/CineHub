import { useEffect, useState } from 'react';
import { fmt, movies } from '../data';
import { go } from '../router';
import { combosTotal, ticketsTotal, useStore } from '../store';
import { btnPrimary, HoldTimer, Icon, Steps } from '../components/ui';
import { fetchConcessions } from '../services/concessionsApi';

export default function Concessions() {
  const { booking, patch, concessions, setConcessions } = useStore();
  const movie = movies.find((v) => String(v.id) === String(booking.movieId));
  const movieTitle = movie?.title || booking.movieTitle || 'Phim';
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
  const tickets = ticketsTotal(booking),
    food = combosTotal(booking, concessions);
  const invalidSelection = concessions.some(
    (item) =>
      qty(item.id) > 0 &&
      (booking.seats.length < item.minSeats || booking.seats.length > item.maxSeats),
  );

  return (
    <main>
      <HoldTimer />
      <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-9">
        <button
          onClick={() => go('/booking/seats')}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-white/45 hover:text-white"
        >
          <Icon name="back" size={17} /> Quay lại chọn ghế
        </button>
        <Steps current={2} />
        <h1 className="text-3xl font-extrabold tracking-tight">Bắp nước</h1>
        <p className="mt-2 text-sm text-white/45">
          Đặt trước để nhận ngay tại quầy, không phải xếp hàng. Bạn có thể bỏ qua bước này.
        </p>

        {loading && <p className="mt-8 text-sm text-white/60">Đang tải bắp nước từ rạp...</p>}
        {error && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
            <p role="alert" className="text-sm text-red-200">
              {error}
            </p>
            <button
              onClick={() => setReload((value) => value + 1)}
              className="mt-3 text-sm font-bold text-white underline underline-offset-4"
            >
              Thử tải lại
            </button>
          </div>
        )}
        {!loading && !error && concessions.length === 0 && (
          <p className="mt-8 text-sm text-white/60">Rạp chưa có sản phẩm bắp nước.</p>
        )}
        {!loading && !error && concessions.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {concessions.map((c) => {
              const eligible =
                booking.seats.length >= c.minSeats && booking.seats.length <= c.maxSeats;
              return (
                <li
                  key={c.id}
                  className={`glass-card flex items-center gap-4 rounded-2xl p-4 ${qty(c.id) ? 'glass-selected' : ''}`}
                >
                  <div
                    className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#f5b50a]"
                    aria-hidden="true"
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <Icon
                        name={
                          c.category === 'DRINK'
                            ? 'drink'
                            : c.category === 'SNACK'
                              ? 'snack'
                              : 'popcorn'
                        }
                        size={30}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold">{c.name}</h2>
                    <p className="mt-1 text-xs leading-5 text-white/40">
                      {c.description || c.category}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <b className="tabular-nums text-[#f5b50a]">{fmt(c.price)}</b>
                      <div className="flex items-center gap-1 rounded-full border border-white/12 p-1">
                        <button
                          onClick={() => set(c.id, qty(c.id) - 1)}
                          disabled={!qty(c.id)}
                          aria-label={`Giảm ${c.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30"
                        >
                          <Icon name="minus" size={16} />
                        </button>
                        <span
                          className="w-6 text-center text-sm font-bold tabular-nums"
                          aria-live="polite"
                        >
                          {qty(c.id)}
                        </span>
                        <button
                          onClick={() => set(c.id, qty(c.id) + 1)}
                          disabled={!eligible}
                          aria-label={`Tăng ${c.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full bg-[#e50914] hover:bg-[#ff101c] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icon name="plus" size={16} />
                        </button>
                      </div>
                    </div>
                    {!eligible && (
                      <p className="mt-2 text-[11px] text-amber-200/80">
                        Cần chọn từ {c.minSeats} đến {c.maxSeats} ghế
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {invalidSelection && (
          <p role="alert" className="mt-4 text-sm text-amber-200">
            Số ghế đã thay đổi. Hãy bỏ các combo không còn đủ điều kiện hoặc quay lại chọn ghế.
          </p>
        )}
        <p className="mt-6 text-xs text-white/30">
          {movieTitle} · {booking.cinema} · {booking.time}
        </p>
      </div>

      <div className="glass-panel sticky bottom-0 z-30 border-t border-white/15">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 md:px-9">
          <div className="flex-1 text-xs text-white/45">
            <div>
              Vé ({booking.seats.length}): <b className="text-white">{fmt(tickets)}</b>
            </div>
            <div className="mt-1">
              Bắp nước: <b className="text-white">{fmt(food)}</b>
            </div>
          </div>
          <div className="text-right">
            <small className="text-xs text-white/40">Tổng tiền</small>
            <b className="block text-xl tabular-nums">{fmt(tickets + food)}</b>
          </div>
          <button
            onClick={() => go('/booking/checkout')}
            disabled={invalidSelection}
            className={btnPrimary}
          >
            {food ? 'Tiếp tục' : 'Bỏ qua và tiếp tục'} <Icon name="arrow" size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}
