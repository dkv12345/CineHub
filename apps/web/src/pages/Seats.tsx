import { useState } from 'react';
import { go } from '../router';
import { fmt, hash, movies, PRICE } from '../data';
import { ticketsTotal, useStore } from '../store';
import type { SeatZone } from '../store';
import { HoldTimer, Icon, Modal } from '../components/ui';
import SeatMap3D, { layoutForCinema } from '../components/SeatMap3D';
import type { SeatCell } from '../components/SeatMap3D';

const MAX = 6;
const STEPS = ['Chọn ghế', 'Bắp nước', 'Thanh toán'];

// Component Steps trực tiếp trong file với màu sắc cố định #ffffff và #fcd34d tránh bị theme sáng ghi đè
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

export default function Seats() {
  const { booking, patch, reset } = useStore();
  const m = movies.find((v) => String(v.id) === String(booking.movieId)) || {
    id: booking.movieId || 1,
    title: booking.movieTitle || 'Phim',
    backdrop: booking.moviePoster || '',
    poster: booking.moviePoster || '',
    age: booking.movieAge || 'T13',
    genre: 'Hành động, Phiêu lưu',
    duration: String(booking.movieDuration || 120),
    director: 'Galaxy Cinema',
    cast: '',
    rating: 8.5,
    votes: 100,
    status: 'now' as const,
    release: '2026',
    synopsis: '',
  };

  const key = `${booking.movieId}${booking.cinema}${booking.dateLabel}${booking.time}`;
  const layout = layoutForCinema(booking.cinema);

  // State lưu trữ ghế đang yêu cầu xác nhận đổi/bỏ chọn
  const [confirmSeat, setConfirmSeat] = useState<SeatCell | null>(null);

  const isSold = (id: string, r: number, c: number) => (hash(key + id) + r * 13 + c * 7) % 100 < 18;
  const sel = booking.seats;
  const total = ticketsTotal(booking);

  const seats = Array.from({ length: layout.rows }, (_, rowIndex) => {
    const row = String.fromCharCode(65 + rowIndex);
    return Array.from({ length: layout.columns }, (_, columnIndex) => {
      const id = `${row}${columnIndex + 1}`;
      const zone: SeatZone =
        rowIndex === layout.sweetbox.row &&
        columnIndex + 1 >= layout.sweetbox.from &&
        columnIndex + 1 <= layout.sweetbox.to
          ? 'sweetbox'
          : rowIndex >= layout.vipFromRow
            ? 'vip'
            : 'normal';
      return {
        id,
        row,
        rowIndex,
        column: columnIndex,
        zone,
        sold: isSold(id, rowIndex, columnIndex),
        selected: sel.includes(id),
      };
    });
  }).flat();

  // Xử lý khi chọn / bấm lại ghế
  const chooseSeat = (seat: SeatCell) => {
    if (seat.sold) return;
    const wasSelected = sel.includes(seat.id);

    if (wasSelected) {
      // Nếu bấm lại ghế đã chọn -> Mở bảng thông báo hỏi người dùng
      setConfirmSeat(seat);
    } else {
      // Chọn ghế mới nếu chưa vượt quá giới hạn
      if (sel.length >= MAX) return;
      const seatTypes = { ...booking.seatTypes, [seat.id]: seat.zone };
      patch({
        seats: [...sel, seat.id],
        seatTypes,
      });
    }
  };

  // Hàm thực hiện bỏ chọn ghế
  const handleUnselectSeat = (seatId: string) => {
    const seatTypes = { ...booking.seatTypes };
    delete seatTypes[seatId];
    patch({
      seats: sel.filter((id) => id !== seatId),
      seatTypes,
    });
    setConfirmSeat(null);
  };

  return (
    <main className="relative min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <HoldTimer />

      {/* 1. Hình nền Poster Phủ Tràn Background với Gradient Overlay dịu */}
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

      {/* 2. Nội dung UI Đặt Ghế */}
      <div className="relative z-10 mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        {/* Nút quay lại & Các bước thanh toán */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              reset();
              go('/showtimes');
            }}
            className="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125"
            style={{ color: '#fcd34d' }}
          >
            <Icon name="back" size={16} /> Đổi suất chiếu
          </button>
          <div className="w-full sm:w-auto">
            <CustomSteps current={1} />
          </div>
        </div>

        {/* Khung chính 2 Cột */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Cột Trái: Thông tin phim, Bộ lọc & Sơ đồ ghế hoàn toàn trong suốt */}
          <div className="flex flex-col gap-6">
            {/* Header Phim (Tiêu đề, Đánh giá, Thể loại) */}
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

            {/* Thanh Thông Tin Suất Chiếu & Chú Thích Ghế */}
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
                    Ngày
                  </span>
                  <span style={{ color: '#ffffff' }}>{booking.dateLabel}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div className="text-xs font-black uppercase">
                  <span className="block text-[10px]" style={{ color: '#fcd34d' }}>
                    Suất chiếu
                  </span>
                  <span style={{ color: '#ffffff' }}>{booking.time}</span>
                </div>
              </div>

              {/* Chú thích loại ghế (Legend) */}
              <div
                className="flex flex-wrap items-center gap-4 text-xs font-extrabold"
                style={{ color: '#ffffff' }}
              >
                <span className="flex items-center gap-1.5">
                  <i className="h-3.5 w-3.5 rounded border border-[#7046c8] bg-[#8054d7]" />
                  Thường
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-3.5 w-3.5 rounded border border-[#c48848] bg-[#dca762]" />
                  VIP
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-3.5 w-3.5 rounded border border-[#cc5c89] bg-[#e589ae]" />
                  Sweetbox
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-3.5 w-3.5 rounded border border-red-500 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  Đang chọn
                </span>
                <span className="flex items-center gap-1.5 opacity-60">
                  <i className="h-3.5 w-3.5 rounded border border-slate-600 bg-slate-700" />
                  Đã đặt
                </span>
              </div>
            </div>

            {/* Sơ đồ ghế TRONG SUỐT */}
            <div className="py-2">
              <div className="mb-4 text-center">
                <span
                  className="text-[11px] font-black uppercase tracking-[0.2em]"
                  style={{ color: '#fcd34d' }}
                >
                  MÀN HÌNH CHIẾU CHÍNH
                </span>
                <div className="mx-auto mt-2 h-1.5 w-3/4 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_4px_12px_rgba(251,191,36,0.6)]" />
              </div>

              <div className="my-6">
                <SeatMap3D layout={layout} seats={seats} onChoose={chooseSeat} />
              </div>
            </div>
          </div>

          {/* Cột Phải Sidebar: Poster, Ghế đã chọn, Tổng tiền & Nút Mua ngay */}
          <aside className="sticky top-6 flex flex-col gap-5 rounded-3xl border border-white/20 bg-slate-950/25 p-6 shadow-2xl backdrop-blur-xl">
            {/* Poster Phim dạng thẻ dọc + Nút Trailer */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-white/20">
              {m.poster && (
                <img
                  src={m.poster}
                  alt={m.title}
                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <button
                type="button"
                onClick={() => go(`/movie/${m.id}?trailer=1`)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-white/40 bg-slate-950/80 px-4 py-2 text-xs font-black shadow-lg backdrop-blur transition hover:bg-white hover:text-black"
                style={{ color: '#ffffff' }}
              >
                <Icon name="play" size={15} /> Xem Trailer
              </button>
            </div>

            {/* Bảng Danh Sách Ghế Đã Chọn */}
            <div className="border-t border-white/10 pt-4">
              <div
                className="flex items-center justify-between text-xs font-black uppercase tracking-wider"
                style={{ color: '#fcd34d' }}
              >
                <span>Ghế đã chọn</span>
                <span>
                  {sel.length}/{MAX} Ghế
                </span>
              </div>

              {sel.length ? (
                <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                  {sel.map((seatId) => {
                    const zone = booking.seatTypes[seatId] || 'normal';
                    const price = PRICE[zone] || PRICE.regular;
                    return (
                      <div
                        key={seatId}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-xs font-bold"
                      >
                        <span className="font-black" style={{ color: '#ffffff' }}>
                          Hàng ghế <b style={{ color: '#fcd34d' }}>{seatId}</b>{' '}
                          <span className="text-[10px] font-normal" style={{ color: '#ffffff' }}>
                            ({zone === 'sweetbox' ? 'Sweetbox' : zone === 'vip' ? 'VIP' : 'Thường'})
                          </span>
                        </span>
                        <span className="font-black" style={{ color: '#fcd34d' }}>
                          {fmt(price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="mt-3 rounded-xl border border-dashed border-white/20 bg-slate-900/40 p-4 text-center text-xs font-extrabold"
                  style={{ color: '#ffffff' }}
                >
                  Chưa chọn ghế nào
                </div>
              )}
            </div>

            {/* Tính Tổng Tiền & Nút Mua Ngay */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-end justify-between">
                <span
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: '#fcd34d' }}
                >
                  Tổng cộng
                </span>
                <span className="text-2xl font-black tabular-nums" style={{ color: '#fcd34d' }}>
                  {fmt(total)}
                </span>
              </div>

              <button
                type="button"
                disabled={!sel.length}
                onClick={() => go('/booking/concessions')}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: '#ffffff' }}
              >
                Tiếp tục (Bắp nước) <Icon name="arrow" size={17} />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* 3. Modal Thông Báo Khi Bấm Lại Ghế Đã Chọn */}
      {confirmSeat && (
        <Modal onClose={() => setConfirmSeat(null)}>
          <div className="p-2 text-center">
            <h3 className="text-lg font-black" style={{ color: '#ffffff' }}>
              Bạn muốn chọn ghế khác?
            </h3>
            <p className="mt-3 text-sm font-bold" style={{ color: '#ffffff' }}>
              Bạn vừa nhấn lại vào <span style={{ color: '#fcd34d' }}>Ghế {confirmSeat.id}</span> đã
              chọn.
            </p>
            <p className="mt-1 text-xs font-semibold opacity-80" style={{ color: '#ffffff' }}>
              Bạn có muốn bỏ chọn ghế này để chọn ghế khác không?
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmSeat(null)}
                className="rounded-xl border border-white/20 bg-slate-800/80 px-5 py-2.5 text-xs font-black transition hover:bg-slate-700"
                style={{ color: '#ffffff' }}
              >
                Giữ lại ghế {confirmSeat.id}
              </button>
              <button
                type="button"
                onClick={() => handleUnselectSeat(confirmSeat.id)}
                className="rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:brightness-125"
                style={{ color: '#ffffff' }}
              >
                Bỏ chọn ghế {confirmSeat.id}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
