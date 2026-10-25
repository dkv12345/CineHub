import { useMemo, useState } from 'react';
import { movies, hash } from '../data';
import { Link } from '../router';
import { useStore } from '../store';
import type { Order } from '../store';
import { btnBookTicket, Icon, Modal } from '../components/ui';

// Component Mã vạch (Barcode) chân thực cho cuống vé trắng
function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    return Array.from({ length: 38 }, (_, i) => {
      const w = (hash(code + i) % 3) + 1; // Độ dày vạch 1px - 3px
      const isGap = hash(code + i * 7) % 5 === 0;
      return { width: w, isGap };
    });
  }, [code]);

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div className="flex h-10 items-stretch gap-[1.5px] overflow-hidden px-1">
        {bars.map((b, i) => (
          <span
            key={i}
            style={{
              width: `${b.width}px`,
              backgroundColor: b.isGap ? 'transparent' : '#000000',
            }}
            className="inline-block h-full"
          />
        ))}
      </div>
      <span className="mt-1 font-mono text-[9px] font-bold tracking-widest text-slate-800">
        {code}
      </span>
    </div>
  );
}

// Component Mã QR cho Modal phóng to
function QR({ code }: { code: string }) {
  const N = 25;
  const cells = useMemo(() => {
    const finder = (r: number, c: number) =>
      [
        [0, 0],
        [0, N - 7],
        [N - 7, 0],
      ].some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
    const ring = (r: number, c: number) =>
      [
        [0, 0],
        [0, N - 7],
        [N - 7, 0],
      ].some(([fr, fc]) => {
        const a = r - fr,
          b = c - fc;
        if (a < 0 || b < 0 || a > 6 || b > 6) return false;
        return a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4);
      });
    return Array.from({ length: N * N }, (_, i) => {
      const r = Math.floor(i / N),
        c = i % N;
      return finder(r, c) ? ring(r, c) : (hash(code + i) >> 3) % 2 === 0;
    });
  }, [code]);

  return (
    <div
      className="mx-auto grid h-[220px] w-[220px] rounded-xl bg-white p-3 shadow-2xl"
      style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
      role="img"
      aria-label={`Mã QR ${code}`}
    >
      {cells.map((on, i) => (
        <i key={i} className={on ? 'bg-black' : ''} />
      ))}
    </div>
  );
}

// Thẻ Vé kiểu Cuống Vé Rạp Phim (Sửa hình nền Poster sáng rõ nét)
function TicketStubCard({ o, onQR }: { o: Order; onQR: () => void }) {
  const m = movies.find((v) => String(v.id) === String(o.movieId)) || {
    id: o.movieId,
    title: o.movieTitle || 'Phim đã đặt',
    poster: o.moviePoster || '',
    backdrop: o.moviePoster || '',
  };
  const past = o.status === 'past';

  return (
    <li
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/20 shadow-2xl transition duration-300 hover:border-amber-400/80 md:flex-row ${
        past ? 'opacity-60 grayscale-[30%]' : ''
      }`}
    >
      {/* 1. Phần Cuống Vé Trắng Bên Trái (White Stub) */}
      <div className="relative flex w-full shrink-0 flex-col justify-between bg-white p-4 text-slate-950 md:w-[240px]">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>RẠP CHIẾU</span>
            <span className="font-bold text-red-600">{o.format || '2D/3D'}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="block text-[9px] font-black uppercase text-slate-400">
                GỐC / HÀNG
              </span>
              <b className="text-xs font-black text-slate-900">{o.seats[0]?.[0] || 'A'}</b>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase text-slate-400">GHẾ</span>
              <b className="text-xs font-black text-slate-900">{o.seats.join(', ')}</b>
            </div>
            <div className="col-span-2 mt-1">
              <span className="block text-[9px] font-black uppercase text-slate-400">
                NGÀY & GIỜ
              </span>
              <b className="text-xs font-black text-slate-900">
                {o.dateLabel} · {o.time}
              </b>
            </div>
          </div>
        </div>

        {/* Mã vạch chân thực */}
        <Barcode code={o.code} />

        <div className="truncate text-center text-[10px] font-black uppercase text-slate-600">
          {o.cinema}
        </div>

        {/* Đường cắt xé vé rạp phim (Vết khuyết góc) */}
        <div className="pointer-events-none absolute -right-3 top-0 z-10 hidden h-full w-6 bg-transparent md:block">
          <div className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#020617]" />
          <div className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#020617]" />
        </div>
      </div>

      {/* Đường nét đứt ranh giới xé vé */}
      <div className="z-10 hidden border-r-2 border-dashed border-white/20 md:block" />

      {/* 2. Phần Thân Vé Cinematic Bên Phải (Dark Stub Body với Poster sáng nét hơn) */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-between bg-slate-950 p-5 text-white md:p-6">
        {/* Poster nền nâng opacity-60 & giảm lớp tối gradient để nhìn rõ poster */}
        {m.poster && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
            <img
              src={m.poster}
              alt=""
              className="h-full w-full object-cover object-center blur-[1px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
          </div>
        )}

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span
              className="rounded-md border border-amber-300/40 bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase"
              style={{ color: '#fcd34d' }}
            >
              {o.format || 'STANDARD'} {o.screenName ? `· ${o.screenName}` : ''}
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              {o.cinema}
            </span>
          </div>

          <h2
            className="mt-3 truncate text-2xl font-black uppercase tracking-tight sm:text-3xl"
            style={{ color: '#ffffff' }}
          >
            {m.title}
          </h2>

          {/* Lưới thông số vé dạng cột chuẩn */}
          <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-white/20 bg-slate-950/70 p-3 backdrop-blur-md">
            <div>
              <span className="block text-[10px] font-black uppercase text-amber-400/90">HÀNG</span>
              <b className="text-sm font-black" style={{ color: '#ffffff' }}>
                {o.seats[0]?.[0] || 'A'}
              </b>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-amber-400/90">
                SỐ GHẾ
              </span>
              <b className="block truncate text-sm font-black" style={{ color: '#fcd34d' }}>
                {o.seats.join(', ')}
              </b>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-amber-400/90">NGÀY</span>
              <b className="text-sm font-black" style={{ color: '#ffffff' }}>
                {o.dateLabel}
              </b>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-amber-400/90">
                GIỜ CHIẾU
              </span>
              <b className="text-sm font-black" style={{ color: '#ffffff' }}>
                {o.time}
              </b>
            </div>
          </div>
        </div>

        {/* Nút thao tác dưới chân vé */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <span className="truncate text-xs font-bold text-slate-300">
            Mã vé: <b style={{ color: '#ffffff' }}>{o.code}</b>
          </span>

          {past ? (
            <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-black text-slate-400">
              Đã sử dụng
            </span>
          ) : (
            <button
              type="button"
              onClick={onQR}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:brightness-125"
              style={{ color: '#ffffff' }}
            >
              <Icon name="qr" size={16} /> Quét mã QR vào rạp
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function MyTickets() {
  const { orders } = useStore();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [qr, setQr] = useState<Order | null>(null);

  const list = orders.filter((o) => o.status === tab);
  const qm = qr && movies.find((v) => String(v.id) === String(qr.movieId));

  return (
    <main className="relative min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      {/* Background Gradient Cinema */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_10%,_#020617_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/90 via-[#020617]/70 to-[#020617]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1100px] px-5 py-8 md:px-9 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{ color: '#fcd34d' }}
            >
              RẠP CHIẾU PHIM QUỐC TẾ
            </p>
            <h1
              className="mt-1 text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: '#ffffff' }}
            >
              Vé của tôi
            </h1>
          </div>

          {/* Tab chuyển đổi Vé sắp tới / Lịch sử vé */}
          <div
            role="tablist"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur-md"
          >
            {(
              [
                ['upcoming', 'Vé sắp tới'],
                ['past', 'Lịch sử vé'],
              ] as const
            ).map(([k, t]) => {
              const isActive = tab === k;
              const count = orders.filter((o) => o.status === k).length;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(k)}
                  className={`rounded-xl px-5 py-2 text-xs font-black transition ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={{ color: isActive ? '#ffffff' : undefined }}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Danh sách thẻ vé dạng Ticket Stub */}
        {list.length ? (
          <ul className="mt-8 space-y-6">
            {list.map((o) => (
              <TicketStubCard key={o.code} o={o} onQR={() => setQr(o)} />
            ))}
          </ul>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-white/20 bg-slate-950/30 px-6 py-16 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-bold" style={{ color: '#ffffff' }}>
              Bạn chưa có vé nào ở mục này.
            </p>
            <Link
              to="/showtimes"
              className={`${btnBookTicket} mt-6 inline-flex items-center justify-center`}
            >
              Đặt vé ngay
            </Link>
          </div>
        )}

        {/* Modal Xem Mã QR To Toàn Màn Hình */}
        {qr && (
          <Modal onClose={() => setQr(null)}>
            <div className="p-2 text-center">
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: '#fcd34d' }}
              >
                MÃ VÉ VÀO RẠP CHIẾU
              </span>
              <h2 className="mt-1 text-2xl font-black" style={{ color: '#ffffff' }}>
                {qm?.title || qr.movieTitle}
              </h2>
              <p className="mt-1 text-xs font-bold" style={{ color: '#ffffff' }}>
                {qr.cinema} · {qr.time} · {qr.dateLabel}
              </p>

              <div className="mt-6 flex flex-col items-center">
                <QR code={qr.code} />
                <b
                  className="mt-4 block text-xl font-black tracking-widest"
                  style={{ color: '#fcd34d' }}
                >
                  {qr.code}
                </b>
                <p className="mt-2 text-xs font-semibold opacity-80" style={{ color: '#ffffff' }}>
                  Ghế đã đặt: <b style={{ color: '#fcd34d' }}>{qr.seats.join(', ')}</b>
                </p>
                <p className="mt-1 text-[11px] font-bold opacity-60" style={{ color: '#ffffff' }}>
                  Đưa mã QR này cho nhân viên soát vé tại rạp để nhận vé cứng.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQr(null)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-red-600 to-amber-500 py-3 text-xs font-black text-white shadow-lg transition hover:brightness-125"
                style={{ color: '#ffffff' }}
              >
                Xong
              </button>
            </div>
          </Modal>
        )}
      </div>
    </main>
  );
}
