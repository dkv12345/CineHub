import { useEffect, useId, useState } from 'react';
import { go, Link } from '../router';
import { useStore } from '../store';
import { Icon } from '../components/ui';
import { movies } from '../data';
import * as authApi from '../services/authApi';

const emailOk = (s: string) => /^\S+@\S+\.\S+$/.test(s);
const MIN_PASSWORD = 8;

export type AuthMode = 'login' | 'register' | 'forgot';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  barClass: string;
  checks: {
    length: boolean;
    mixedCase: boolean;
    numbers: boolean;
    special: boolean;
  };
}

function calculatePasswordStrength(pw: string): PasswordStrength {
  const checks = {
    length: pw.length >= MIN_PASSWORD,
    mixedCase: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    numbers: /\d/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw),
  };

  let score = 0;
  if (checks.length) score += 1;
  if (checks.mixedCase) score += 1;
  if (checks.numbers) score += 1;
  if (checks.special) score += 1;

  if (pw.length === 0) {
    return { score: 0, label: '', color: 'transparent', barClass: '', checks };
  }

  switch (score) {
    case 1:
      return { score: 1, label: 'Yếu', color: '#ff5a63', barClass: 'bg-[#ff5a63]', checks };
    case 2:
      return { score: 2, label: 'Trung bình', color: '#f59e0b', barClass: 'bg-[#f59e0b]', checks };
    case 3:
      return { score: 3, label: 'Khá mạnh', color: '#38bdf8', barClass: 'bg-[#38bdf8]', checks };
    case 4:
    default:
      return { score: 4, label: 'Rất mạnh', color: '#46d38a', barClass: 'bg-[#46d38a]', checks };
  }
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
      />
    </svg>
  );
}

export default function Auth({ mode, next }: { mode: AuthMode; next: string }) {
  const { startSession } = useStore();
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password specific state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Password visibility
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const rememberId = useId();

  // Synchronize internal mode if URL changes
  useEffect(() => {
    setCurrentMode(mode);
    setFormError('');
    setErr({});
  }, [mode]);

  // Cooldown countdown for resend reset link
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const t = setTimeout(() => setResetCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resetCooldown]);

  const isLogin = currentMode === 'login';
  const isRegister = currentMode === 'register';
  const isForgot = currentMode === 'forgot';

  const setField = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    if (err[k]) setErr((prev) => ({ ...prev, [k]: '' }));
    if (formError) setFormError('');
  };

  const pwStrength = isRegister ? calculatePasswordStrength(f.pw) : null;
  const passwordsMatch = !isLogin && f.pw2.length > 0 && f.pw === f.pw2;

  const goVerify = (email: string) =>
    go(`/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation: Record<string, string> = {};
    if (isRegister && !f.name.trim()) validation.name = 'Vui lòng nhập họ và tên của bạn.';
    if (!emailOk(f.email)) validation.email = 'Email chưa đúng định dạng (ví dụ: ban@domain.com).';
    if (isLogin) {
      if (!f.pw) validation.pw = 'Vui lòng nhập mật khẩu.';
    } else {
      if (f.pw.length < MIN_PASSWORD) {
        validation.pw = `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`;
      }
      if (f.pw2 !== f.pw) {
        validation.pw2 = 'Mật khẩu xác nhận không khớp.';
      }
    }

    setErr(validation);
    setFormError('');
    if (Object.keys(validation).length) return;

    const email = f.email.trim().toLowerCase();
    setSubmitting(true);
    try {
      if (isLogin) {
        startSession(await authApi.login({ email, password: f.pw }));
        go(next);
      } else {
        await authApi.register({ email, password: f.pw, fullName: f.name.trim() });
        goVerify(email);
      }
    } catch (error) {
      if (authApi.authErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
        goVerify(email);
        return;
      }
      setFormError(authApi.authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotSending || resetCooldown > 0) return;
    if (!emailOk(forgotEmail)) {
      setForgotError('Vui lòng nhập email hợp lệ để nhận liên kết khôi phục.');
      return;
    }
    setForgotError('');
    setForgotSending(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim().toLowerCase());
      setResetSent(true);
      setResetCooldown(60);
    } catch (error) {
      setForgotError(authApi.authErrorMessage(error));
    } finally {
      setForgotSending(false);
    }
  };

  const currentMovie = movies[0];

  return (
    <main className="relative min-h-[calc(100vh-74px)] overflow-hidden bg-[#090b10] text-[#f1f3f7]">
      {/* Ambient background lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-[#e50914]/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-10 h-[450px] w-[450px] rounded-full bg-[#5d86c7]/15 blur-[130px]"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-[1480px] lg:grid-cols-12">
        {/* ================= LEFT CINEMATIC HERO SHOWCASE ================= */}
        <section className="dark-film-content relative hidden flex-col justify-between overflow-hidden p-12 lg:col-span-6 lg:flex xl:col-span-7 xl:p-16">
          <img
            src={currentMovie.backdrop}
            alt="CineHub Premiere"
            className="ambient-poster absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-[#090b10]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090b10]" />

          {/* Top VIP Badge */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e50914]/40 bg-[#e50914]/15 px-3.5 py-1.5 text-xs font-black tracking-wider text-[#ff4d57] uppercase shadow-[0_0_20px_rgba(229,9,20,0.25)] backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#ff4d57]" />
              CineHub VIP Passport
            </span>
            <span className="text-xs font-semibold text-white/50">
              Hệ thống rạp chiếu chuẩn quốc tế
            </span>
          </div>

          {/* Center Brand Statement */}
          <div className="relative z-10 my-auto max-w-[560px] pt-12 pb-8">
            <h2 className="display text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              MỖI CÂU CHUYỆN HAY
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-transparent">
                ĐÁNG ĐƯỢC XEM
              </span>
              <br />
              <span className="text-[#e50914]">TRÊN MÀN ẢNH LỚN.</span>
            </h2>

            <p className="mt-5 text-base leading-relaxed text-white/70">
              Đăng nhập để lưu vé tức thì, trải nghiệm chọn ghế 3D POV chân thực và nhận đặc quyền
              thành viên độc quyền tại 45+ rạp chiếu toàn quốc.
            </p>

            {/* Feature Perks Grid */}
            <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition hover:border-[#e50914]/40 hover:bg-white/[0.07]">
                <div className="mb-2 text-2xl">💺</div>
                <h4 className="text-xs font-bold text-white">Ghế 3D Point-of-View</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/50">
                  Xem trước góc nhìn thật từ ghế ngồi trước khi đặt.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition hover:border-[#e50914]/40 hover:bg-white/[0.07]">
                <div className="mb-2 text-2xl">⚡</div>
                <h4 className="text-xs font-bold text-white">Giữ Ghế 15 Phút</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/50">
                  Khóa vé an toàn, thong thả chọn combo bắp nước.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition hover:border-[#e50914]/40 hover:bg-white/[0.07]">
                <div className="mb-2 text-2xl">🍿</div>
                <h4 className="text-xs font-bold text-white">Điểm Thưởng VIP</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/50">
                  Tích CinePoints đổi vé xem phim và combo miễn phí.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Live Stats */}
          <div className="relative z-10 flex flex-wrap items-center gap-6 border-t border-white/10 pt-6 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white">45+</span> Cụm rạp đối tác
            </div>
            <div className="h-3 w-px bg-white/20" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#f5b50a]">★ 4.9/5</span> từ 120,000+ khán giả
            </div>
            <div className="h-3 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-white/50">
              <Icon name="shield" size={14} color="#46d38a" /> Bảo mật chuẩn SSL 256-bit
            </div>
          </div>
        </section>

        {/* ================= RIGHT INTERACTIVE AUTH FORM ================= */}
        <section className="relative z-10 grid place-items-center px-4 py-10 sm:px-8 lg:col-span-6 xl:col-span-5">
          <div className="w-full max-w-[460px]">
            {/* Top Brand Logo for Mobile */}
            <div className="mb-6 text-center lg:hidden">
              <Link
                to="/home"
                className="inline-block text-2xl font-black tracking-wider text-white"
              >
                CINE<span className="text-[#e50914]">HUB</span>
              </Link>
              <p className="mt-1 text-xs text-white/50">Nền tảng đặt vé điện ảnh thế hệ mới</p>
            </div>

            {/* Glassmorphic Form Card */}
            <div className="rounded-3xl border border-white/10 bg-[#121620]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-9">
              {/* ================= FORGOT PASSWORD VIEW ================= */}
              {isForgot ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('login');
                      setForgotError('');
                      setResetSent(false);
                    }}
                    className="group mb-6 inline-flex items-center gap-2 text-xs font-semibold text-white/50 transition hover:text-white"
                  >
                    <span className="transition group-hover:-translate-x-1">←</span>
                    Quay lại đăng nhập
                  </button>

                  <div className="text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#e50914]/40 bg-[#e50914]/15 text-[#ff4d57] shadow-[0_0_25px_rgba(229,9,20,0.2)]">
                      <Icon name="key" size={26} />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      Khôi phục mật khẩu
                    </h1>
                    <p className="mt-2 text-xs leading-5 text-white/60">
                      Nhập email đã đăng ký. CineHub sẽ gửi hướng dẫn kèm liên kết an toàn để đặt
                      lại mật khẩu trong vòng 15 phút.
                    </p>
                  </div>

                  {resetSent ? (
                    <div className="mt-7 text-center">
                      <div className="rounded-2xl border border-[#46d38a]/30 bg-[#46d38a]/10 p-5">
                        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#46d38a]/20 text-[#46d38a]">
                          <Icon name="check" size={20} />
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-white">Đã gửi hướng dẫn!</h3>
                        <p className="mt-1.5 text-xs leading-5 text-white/70">
                          Nếu email <b className="text-white">{forgotEmail}</b> tồn tại trong hệ
                          thống, một liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.
                        </p>
                        <p className="mt-3 text-[11px] text-white/45">
                          💡 Đừng quên kiểm tra cả thư mục <b>Spam / Thư rác</b> nếu chưa thấy
                          email.
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={submitForgot}
                          disabled={resetCooldown > 0 || forgotSending}
                          className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resetCooldown > 0
                            ? `Gửi lại sau ${resetCooldown}s`
                            : 'Gửi lại email khôi phục'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentMode('login')}
                          className="w-full rounded-xl bg-[#e50914] py-3 text-xs font-bold text-white transition hover:bg-[#b81d24]"
                        >
                          Về trang đăng nhập
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitForgot} noValidate className="mt-7 space-y-4">
                      <div>
                        <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                          Địa chỉ Email
                        </label>
                        <div className="relative mt-2">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                            <Icon name="mail" size={18} />
                          </span>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => {
                              setForgotEmail(e.target.value);
                              if (forgotError) setForgotError('');
                            }}
                            placeholder="ten@email.com"
                            autoComplete="email"
                            className={`w-full rounded-xl border bg-white/[0.05] py-3.5 pr-4 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20 ${forgotError ? 'border-[#ff5a63]' : 'border-white/10'}`}
                          />
                        </div>
                        {forgotError && (
                          <p role="alert" className="mt-1.5 text-[11px] font-medium text-[#ff5a63]">
                            {forgotError}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={forgotSending}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-[0_4px_20px_rgba(229,9,20,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {forgotSending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            Đang gửi liên kết…
                          </>
                        ) : (
                          'Gửi liên kết khôi phục'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* ================= LOGIN & REGISTER TABS VIEW ================= */
                <div>
                  {/* Segmented Mode Pill Navigation */}
                  <div className="relative mb-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1 text-center">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('login')}
                      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${isLogin ? 'bg-[#e50914] text-white shadow-[0_4px_16px_rgba(229,9,20,0.35)]' : 'text-white/60 hover:text-white'}`}
                    >
                      <Icon name="user" size={15} />
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentMode('register')}
                      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${isRegister ? 'bg-[#e50914] text-white shadow-[0_4px_16px_rgba(229,9,20,0.35)]' : 'text-white/60 hover:text-white'}`}
                    >
                      <Icon name="sparkles" size={15} />
                      Tạo tài khoản
                    </button>
                  </div>

                  {/* Header Title */}
                  <div className="mb-6">
                    <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      {isLogin ? 'Chào mừng trở lại' : 'Trở thành Hội viên VIP'}
                    </h1>
                    <p className="mt-1.5 text-xs text-white/50">
                      {isLogin
                        ? 'Nhập thông tin tài khoản CineHub để tiếp tục đặt vé.'
                        : 'Khởi tạo tài khoản miễn phí chỉ trong 30 giây.'}
                    </p>
                  </div>

                  {/* Server Form Error Banner */}
                  {formError && (
                    <div
                      role="alert"
                      className="mb-5 flex items-start gap-3 rounded-2xl border border-[#ff5a63]/40 bg-[#ff5a63]/10 p-3.5 text-xs font-medium text-[#ff7880]"
                    >
                      <span className="mt-0.5 shrink-0 text-[#ff5a63]">
                        <Icon name="alert" size={16} />
                      </span>
                      <div className="flex-1 leading-5">{formError}</div>
                    </div>
                  )}

                  {/* Form Inputs */}
                  <form onSubmit={submit} noValidate className="space-y-4">
                    {/* Full Name (Register only) */}
                    {isRegister && (
                      <div>
                        <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                          Họ và tên
                        </label>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                            <Icon name="user" size={18} />
                          </span>
                          <input
                            type="text"
                            value={f.name}
                            onChange={(e) => setField('name')(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            autoComplete="name"
                            className={`w-full rounded-xl border bg-white/[0.05] py-3.5 pr-4 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20 ${err.name ? 'border-[#ff5a63]' : 'border-white/10'}`}
                          />
                        </div>
                        {err.name && (
                          <p role="alert" className="mt-1 text-[11px] font-medium text-[#ff5a63]">
                            {err.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Email Field */}
                    <div>
                      <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                        Email
                      </label>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                          <Icon name="mail" size={18} />
                        </span>
                        <input
                          type="email"
                          value={f.email}
                          onChange={(e) => setField('email')(e.target.value)}
                          placeholder="ten@email.com"
                          autoComplete="email"
                          className={`w-full rounded-xl border bg-white/[0.05] py-3.5 pr-4 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20 ${err.email ? 'border-[#ff5a63]' : 'border-white/10'}`}
                        />
                      </div>
                      {err.email && (
                        <p role="alert" className="mt-1 text-[11px] font-medium text-[#ff5a63]">
                          {err.email}
                        </p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                          Mật khẩu
                        </label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentMode('forgot');
                              setForgotEmail(f.email);
                            }}
                            className="text-xs font-semibold text-[#ff4d57] transition hover:text-[#ff7880] hover:underline"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                          <Icon name="lock" size={18} />
                        </span>
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={f.pw}
                          onChange={(e) => setField('pw')(e.target.value)}
                          placeholder={
                            isLogin ? 'Nhập mật khẩu của bạn' : `Tối thiểu ${MIN_PASSWORD} ký tự`
                          }
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          className={`w-full rounded-xl border bg-white/[0.05] py-3.5 pr-11 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20 ${err.pw ? 'border-[#ff5a63]' : 'border-white/10'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 transition hover:text-white"
                        >
                          <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
                        </button>
                      </div>
                      {err.pw && (
                        <p role="alert" className="mt-1 text-[11px] font-medium text-[#ff5a63]">
                          {err.pw}
                        </p>
                      )}

                      {/* Password Strength Indicator (Register only) */}
                      {isRegister && f.pw.length > 0 && pwStrength && (
                        <div className="mt-2.5 space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/50">Độ mạnh mật khẩu:</span>
                            <span className="font-bold" style={{ color: pwStrength.color }}>
                              {pwStrength.label}
                            </span>
                          </div>
                          {/* 4 Segmented Progress Bar */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 rounded-full transition-all duration-300 ${step <= pwStrength.score ? pwStrength.barClass : 'bg-white/10'}`}
                              />
                            ))}
                          </div>
                          {/* Requirements Checklist */}
                          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.length ? 'text-[#46d38a]' : 'text-white/40'}`}
                            >
                              {pwStrength.checks.length ? '✓' : '•'} Từ 8 ký tự
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.mixedCase ? 'text-[#46d38a]' : 'text-white/40'}`}
                            >
                              {pwStrength.checks.mixedCase ? '✓' : '•'} Hoa & thường
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.numbers ? 'text-[#46d38a]' : 'text-white/40'}`}
                            >
                              {pwStrength.checks.numbers ? '✓' : '•'} Chứa chữ số
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.special ? 'text-[#46d38a]' : 'text-white/40'}`}
                            >
                              {pwStrength.checks.special ? '✓' : '•'} Ký tự đặc biệt
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password (Register only) */}
                    {isRegister && (
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                            Xác nhận mật khẩu
                          </label>
                          {f.pw2.length > 0 && (
                            <span
                              className={`text-[11px] font-bold ${passwordsMatch ? 'text-[#46d38a]' : 'text-[#ff5a63]'}`}
                            >
                              {passwordsMatch ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                            </span>
                          )}
                        </div>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                            <Icon name="lock" size={18} />
                          </span>
                          <input
                            type={showPw2 ? 'text' : 'password'}
                            value={f.pw2}
                            onChange={(e) => setField('pw2')(e.target.value)}
                            placeholder="Nhập lại mật khẩu"
                            autoComplete="new-password"
                            className={`w-full rounded-xl border bg-white/[0.05] py-3.5 pr-11 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20 ${err.pw2 ? 'border-[#ff5a63]' : 'border-white/10'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw2(!showPw2)}
                            aria-label={showPw2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 transition hover:text-white"
                          >
                            <Icon name={showPw2 ? 'eyeOff' : 'eye'} size={18} />
                          </button>
                        </div>
                        {err.pw2 && (
                          <p role="alert" className="mt-1 text-[11px] font-medium text-[#ff5a63]">
                            {err.pw2}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Remember Me checkbox (Login only) */}
                    {isLogin && (
                      <div className="flex items-center pt-1">
                        <label
                          htmlFor={rememberId}
                          className="flex cursor-pointer select-none items-center gap-2 text-xs text-white/60 hover:text-white"
                        >
                          <input
                            id={rememberId}
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#e50914] accent-[#e50914] focus:ring-0"
                          />
                          Ghi nhớ phiên đăng nhập trên thiết bị này
                        </label>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] via-[#ea1d27] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-[0_4px_24px_rgba(229,9,20,0.38)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Đang xử lý…
                        </>
                      ) : isLogin ? (
                        'Đăng nhập ngay'
                      ) : (
                        'Đăng ký tài khoản'
                      )}
                    </button>
                  </form>

                  {/* Social Divider */}
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="w-full border-t border-white/10" />
                    <span className="absolute bg-[#121620] px-3 text-[11px] font-semibold text-white/40 uppercase">
                      Hoặc tiếp tục với
                    </span>
                  </div>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger Google Sign-In or show informational notice
                      alert(
                        'Tính năng đăng nhập Google: Hãy cấu hình GOOGLE_CLIENT_ID trong file .env để kết nối trực tiếp với tài khoản Google của bạn.',
                      );
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold text-white transition hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.99]"
                  >
                    <GoogleIcon />
                    Tiếp tục với Google
                  </button>

                  {/* Terms & Privacy footer */}
                  <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
                    Bằng việc tiếp tục, bạn đồng ý với{' '}
                    <span className="text-white/60 hover:underline">Điều khoản dịch vụ</span> và{' '}
                    <span className="text-white/60 hover:underline">Chính sách bảo mật</span> của
                    CineHub.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
