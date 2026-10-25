import { useState } from 'react';
import { fmt, movies } from '../data';
import { go } from '../router';
import { combosTotal, seatPrice, seatTypeFor, ticketsTotal, useStore } from '../store';
import { HoldTimer, Icon } from '../components/ui';

const STEPS = ['Chọn ghế', 'Bắp nước', 'Thanh toán'];

// Component Steps đồng bộ tông màu #ffffff và #fcd34d
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

const methods = [
  {
    id: 'VNPay',
    desc: 'Quét QR hoặc thanh toán bằng thẻ ATM nội địa',
    badge: 'bg-[#0b4da2]',
    mark: 'VN',
  },
  { id: 'ZaloPay', desc: 'Thanh toán nhanh bằng ví ZaloPay', badge: 'bg-[#1473e6]', mark: 'Z' },
];

export default function Checkout() {
  const { booking, place, concessions } = useStore();
  const [method, setMethod] = useState('VNPay');
  const [busy, setBusy] = useState(false);

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

  const tickets = ticketsTotal(booking);
  const food = combosTotal(booking, concessions);
  const items = concessions.filter((c) => booking.combos[c.id]);

  const pay = () => {
    setBusy(true);
    setTimeout(() => {
      place(method);
      go('/result/success');
    }, 1200);
  };

  const row = 'flex justify-between gap-6 py-3.5 text-sm border-b border-white/10 last:border-0';

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

      {/* 2. Nội dung chính UI Thanh toán */}
      <div className="relative z-10 mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        {/* Nút quay lại & Tiến trình thanh toán */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => go('/booking/concessions')}
            className="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125"
            style={{ color: '#fcd34d' }}
          >
            <Icon name="back" size={16} /> Quay lại bắp nước
          </button>
          <div className="w-full sm:w-auto">
            <CustomSteps current={3} />
          </div>
        </div>

        {/* Bố cục 2 Cột */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Cột trái: Thông tin đơn hàng */}
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

            {/* Chi tiết đơn hàng */}
            <section className="rounded-3xl border border-white/20 bg-slate-950/20 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-black" style={{ color: '#fcd34d' }}>
                Thông tin đơn hàng
              </h2>

              <dl className="mt-4">
                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Phim
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                    {m.title} ({m.age})
                  </dd>
                </div>

                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Suất chiếu
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                    {booking.time} · {booking.dateLabel} ·{' '}
                    <span style={{ color: '#fcd34d' }}>{booking.format}</span>
                  </dd>
                </div>

                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Phòng chiếu
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                    {booking.screenName || 'Sảnh tiêu chuẩn'}
                  </dd>
                </div>

                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Rạp chiếu
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                    {booking.cinema} {booking.cinemaCode ? `(${booking.cinemaCode})` : ''}
                  </dd>
                </div>

                {booking.cinemaAddress && (
                  <div className={row}>
                    <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                      Địa chỉ rạp
                    </dt>
                    <dd
                      className="max-w-[300px] text-right text-xs font-bold"
                      style={{ color: '#ffffff' }}
                    >
                      {booking.cinemaAddress}
                    </dd>
                  </div>
                )}

                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Mã ghế đã chọn
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#fcd34d' }}>
                    {booking.seats
                      .map(
                        (s) =>
                          `${s} (${seatTypeFor(s, booking.seatTypes[s]) === 'sweetbox' ? 'Sweetbox' : seatTypeFor(s, booking.seatTypes[s]) === 'vip' ? 'VIP' : 'Thường'} · ${fmt(seatPrice(s, booking.seatTypes[s]))})`,
                      )
                      .join(', ')}
                  </dd>
                </div>

                <div className={row}>
                  <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                    Bắp nước
                  </dt>
                  <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                    {items.length ? (
                      items.map((c) => (
                        <div key={c.id}>
                          <span style={{ color: '#fcd34d' }}>{booking.combos[c.id]}x</span> {c.name}
                        </div>
                      ))
                    ) : (
                      <span className="font-normal opacity-60" style={{ color: '#ffffff' }}>
                        Không chọn
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Cột phải Sidebar: Chọn phương thức & Nút Thanh toán */}
          <aside className="sticky top-6 flex flex-col gap-5 rounded-3xl border border-white/20 bg-slate-950/25 p-6 shadow-2xl backdrop-blur-xl">
            <fieldset>
              <legend
                className="text-base font-black uppercase tracking-wider"
                style={{ color: '#fcd34d' }}
              >
                Phương thức thanh toán
              </legend>

              <div className="mt-4 space-y-3">
                {methods.map((x) => {
                  const isSelected = method === x.id;
                  return (
                    <label
                      key={x.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition ${
                        isSelected
                          ? 'border-amber-400/80 bg-slate-950/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                          : 'border-white/20 bg-slate-950/20 hover:border-white/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={x.id}
                        checked={isSelected}
                        onChange={() => setMethod(x.id)}
                        className="h-4 w-4 accent-amber-400"
                      />
                      <span
                        className={`grid h-9 w-11 place-items-center rounded-lg text-xs font-black text-white shadow-md ${x.badge}`}
                      >
                        {x.mark}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-sm font-black" style={{ color: '#ffffff' }}>
                          {x.id}
                        </b>
                        <small
                          className="mt-0.5 block text-[11px] font-semibold opacity-80"
                          style={{ color: '#ffffff' }}
                        >
                          {x.desc}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Bảng tính tổng tiền */}
            <div className="space-y-2 border-t border-white/10 pt-4 text-xs font-bold">
              <div className="flex justify-between">
                <span style={{ color: '#ffffff' }}>Vé ({booking.seats.length} ghế)</span>
                <span className="tabular-nums" style={{ color: '#fcd34d' }}>
                  {fmt(tickets)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#ffffff' }}>Bắp nước</span>
                <span className="tabular-nums" style={{ color: '#fcd34d' }}>
                  {fmt(food)}
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between border-t border-white/10 pt-4">
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
              onClick={pay}
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: '#ffffff' }}
            >
              {busy ? 'Đang xử lý...' : 'Thanh toán ngay'}
            </button>

            <button
              type="button"
              onClick={() => go('/result/failed?reason=cancel')}
              disabled={busy}
              className="w-full py-2 text-xs font-bold transition hover:text-amber-300"
              style={{ color: '#ffffff', opacity: 0.7 }}
            >
              Hủy thanh toán
            </button>

            <button
              type="button"
              onClick={() => go('/result/failed?reason=error')}
              disabled={busy}
              className="w-full text-[11px] font-semibold transition hover:opacity-100"
              style={{ color: '#ffffff', opacity: 0.4 }}
            >
              (Demo) Giả lập thanh toán lỗi
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
