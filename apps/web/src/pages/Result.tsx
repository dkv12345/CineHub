import { fmt, movies } from '../data';
import { go, Link } from '../router';
import { useStore } from '../store';
import { Icon } from '../components/ui';

export function Success() {
  const { lastOrder, orders } = useStore();
  const o = lastOrder ?? orders[0];
  const m = o ? movies.find((v) => String(v.id) === String(o.movieId)) : undefined;

  const movieTitle = m?.title || o?.movieTitle || 'Phim';
  const backdrop = m?.backdrop || m?.poster || o?.moviePoster || '';

  if (!o) {
    return (
      <main className="relative grid min-h-screen place-items-center bg-[#020617] px-5 py-12 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-black" style={{ color: '#ffffff' }}>
            Không tìm thấy thông tin đơn hàng
          </h1>
          <Link
            to="/home"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-6 py-3 text-xs font-black text-white shadow-lg transition hover:brightness-125"
            style={{ color: '#ffffff' }}
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-[#020617] px-5 py-12 text-white selection:bg-amber-400 selection:text-black">
      {/* 1. Hình nền Poster Phủ Tràn Background với Gradient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            className="h-full w-full object-cover object-center opacity-100 blur-[0.5px] scale-105"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]" />
      </div>

      {/* 2. Nội dung chính */}
      <div className="relative z-10 w-full max-w-[560px] text-center">
        {/* Badge Icon Thành Công */}
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)] backdrop-blur-md">
          <Icon name="check" size={36} />
        </div>

        <h1
          className="mt-6 text-3xl font-black tracking-tight sm:text-4xl"
          style={{ color: '#ffffff' }}
        >
          Cảm ơn bạn đã đặt vé!
        </h1>
        <p
          className="mt-2 text-xs font-bold leading-relaxed opacity-90 sm:text-sm"
          style={{ color: '#ffffff' }}
        >
          Vé đã được gửi tới email của bạn và lưu trong mục{' '}
          <b style={{ color: '#fcd34d' }}>Vé của tôi</b>.
        </p>

        {/* Khung Thông Tin Đơn Hàng */}
        <div className="mt-8 rounded-3xl border border-white/20 bg-slate-950/30 p-6 text-left shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <small
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: '#fcd34d' }}
              >
                Mã đơn hàng
              </small>
              <b
                className="mt-1 block text-2xl font-black tracking-widest tabular-nums"
                style={{ color: '#fcd34d' }}
              >
                {o.code}
              </b>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400">
              Thành công
            </span>
          </div>

          <dl className="mt-5 space-y-3.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                Phim
              </dt>
              <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                {movieTitle}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                Suất chiếu
              </dt>
              <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                {o.time} · {o.dateLabel}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                Rạp chiếu
              </dt>
              <dd className="text-right font-black" style={{ color: '#ffffff' }}>
                {o.cinema}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="font-semibold opacity-80" style={{ color: '#ffffff' }}>
                Ghế đã đặt
              </dt>
              <dd className="text-right font-black" style={{ color: '#fcd34d' }}>
                {o.seats.join(', ')}
              </dd>
            </div>

            <div className="flex justify-between gap-4 border-t border-white/10 pt-4">
              <dt className="font-black uppercase tracking-wider" style={{ color: '#fcd34d' }}>
                Đã thanh toán ({o.method})
              </dt>
              <dd className="text-xl font-black tabular-nums" style={{ color: '#fcd34d' }}>
                {fmt(o.total)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Nút hành động */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go('/my-tickets')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/40 transition hover:brightness-125"
            style={{ color: '#ffffff' }}
          >
            <Icon name="ticket" size={18} /> Xem vé của tôi
          </button>
          <Link
            to="/home"
            className="inline-flex items-center rounded-xl border border-white/20 bg-slate-900/60 px-6 py-3.5 text-sm font-black transition hover:bg-white/10"
            style={{ color: '#ffffff' }}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}

export function Failed({ reason }: { reason: string }) {
  const { booking } = useStore();
  const movie = movies.find((v) => String(v.id) === String(booking.movieId));
  const backdrop = movie?.backdrop || movie?.poster || booking.moviePoster || '';

  const cancel = reason === 'cancel';
  const canRetry = !!booking.movieId && !!booking.expiresAt && booking.expiresAt > Date.now();

  return (
    <main className="relative grid min-h-screen place-items-center bg-[#020617] px-5 py-12 text-white selection:bg-amber-400 selection:text-black">
      {/* 1. Hình nền Poster Phủ Tràn Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            className="h-full w-full object-cover object-center opacity-100 blur-[0.5px] scale-105"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]" />
      </div>

      {/* 2. Nội dung chính */}
      <div className="relative z-10 w-full max-w-[500px] text-center">
        {/* Badge Icon Thất Bại / Hủy */}
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-red-500/30 bg-red-600/20 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)] backdrop-blur-md">
          <Icon name="alert" size={36} />
        </div>

        <h1
          className="mt-6 text-3xl font-black tracking-tight sm:text-4xl"
          style={{ color: '#ffffff' }}
        >
          {cancel ? 'Bạn đã hủy thanh toán' : 'Thanh toán không thành công'}
        </h1>

        <div className="mt-6 rounded-3xl border border-white/20 bg-slate-950/30 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
          <p
            className="text-xs font-semibold leading-relaxed opacity-90 sm:text-sm"
            style={{ color: '#ffffff' }}
          >
            {cancel
              ? 'Đơn hàng chưa được tạo và bạn chưa bị trừ tiền trong tài khoản.'
              : 'Giao dịch bị từ chối hoặc gián đoạn. Tiền chưa bị trừ, hoặc sẽ được hệ thống hoàn tiền trong 3–5 ngày làm việc.'}
          </p>

          <div
            className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs font-bold"
            style={{ color: '#fcd34d' }}
          >
            {canRetry
              ? '⏳ Ghế của bạn vẫn đang được giữ trong thời gian đếm ngược. Vui lòng thử lại ngay!'
              : '⚠️ Đã hết thời gian giữ ghế. Vui lòng chọn lại suất chiếu.'}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(canRetry ? '/booking/checkout' : '/showtimes')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/40 transition hover:brightness-125"
            style={{ color: '#ffffff' }}
          >
            {canRetry ? 'Thử lại thanh toán' : 'Chọn lại suất chiếu'}
          </button>
          <Link
            to="/home"
            className="inline-flex items-center rounded-xl border border-white/20 bg-slate-900/60 px-6 py-3.5 text-sm font-black transition hover:bg-white/10"
            style={{ color: '#ffffff' }}
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
