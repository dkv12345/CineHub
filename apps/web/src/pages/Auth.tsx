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

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env?.VITE_GOOGLE_CLIENT_ID ||
  '430901569705-uermo89vl0jrrdgj98kegd3ccup37ah7.apps.googleusercontent.com';

export default function Auth({ mode, next }: { mode: AuthMode; next: string }) {
  const { startSession } = useStore();
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  // Google Identity Services (GIS) initialization
  useEffect(() => {
    const handleGoogleResponse = async (response: { credential?: string }) => {
      if (!response.credential) return;
      try {
        setGoogleLoading(true);
        setFormError('');
        const session = await authApi.loginWithGoogle(response.credential);
        startSession(session);
        go(next || '/');
      } catch (error) {
        setFormError(authApi.authErrorMessage(error));
      } finally {
        setGoogleLoading(false);
      }
    };

    const initGoogle = () => {
      if (window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const slot = document.getElementById('google-btn-slot');
          if (slot) {
            slot.innerHTML = '';
            window.google.accounts.id.renderButton(slot, {
              theme: 'outline',
              size: 'large',
              text: currentMode === 'register' ? 'signup_with' : 'signin_with',
              shape: 'rectangular',
              width: 360,
              logo_alignment: 'left',
            });
          }
        } catch {
          // Ignore if GIS already initialized
        }
      }
    };

    initGoogle();
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(timer);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [currentMode, next, startSession]);

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
    <main className="relative min-h-[calc(100vh-74px)] overflow-hidden bg-[#dedbd4] py-8 px-4 text-slate-800 sm:px-6 lg:px-8">
      {/* Ambient background lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[550px] rounded-full bg-[#e50914]/10 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-10 h-[450px] w-[450px] rounded-full bg-[#5d86c7]/10 blur-[130px]"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-130px)] max-w-[1360px] items-center gap-8 lg:grid-cols-12">
        {/* ================= LEFT CINEMATIC HERO SHOWCASE ================= */}
        <section className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden rounded-3xl border border-black/10 bg-[#161a24] p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] lg:col-span-6 lg:flex xl:col-span-7 xl:p-14">
          <img
            src={currentMovie.backdrop}
            alt="CineHub Premiere"
            className="ambient-poster absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-luminosity brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161a24] via-[#161a24]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#161a24]/80" />

          {/* Top VIP Badge */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e50914]/40 bg-[#e50914]/20 px-3.5 py-1.5 text-xs font-black tracking-wider text-[#ff4d57] uppercase shadow-[0_0_20px_rgba(229,9,20,0.25)] backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#ff4d57]" />
              CineHub VIP Passport
            </span>
            <span className="text-xs font-semibold text-white/70">
              Hệ thống rạp chiếu chuẩn quốc tế
            </span>
          </div>

          {/* Center Brand Statement */}
          <div className="relative z-10 my-auto max-w-[560px] pt-8 pb-6">
            <h2 className="display text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              MỖI CÂU CHUYỆN HAY
              <br />
              <span className="bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                ĐÁNG ĐƯỢC XEM
              </span>
              <br />
              <span className="text-[#e50914]">TRÊN MÀN ẢNH LỚN.</span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Đăng nhập để lưu vé tức thì, trải nghiệm chọn ghế 3D POV chân thực và nhận đặc quyền
              thành viên độc quyền tại 45+ rạp chiếu toàn quốc.
            </p>

            {/* Feature Perks Grid */}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition hover:border-[#e50914]/50 hover:bg-white/15">
                <div className="mb-1.5 text-2xl">💺</div>
                <h4 className="text-xs font-bold text-white">Ghế 3D POV</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/70">
                  Xem trước góc nhìn thật từ ghế ngồi trước khi đặt.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition hover:border-[#e50914]/50 hover:bg-white/15">
                <div className="mb-1.5 text-2xl">⚡</div>
                <h4 className="text-xs font-bold text-white">Giữ Ghế 15 Phút</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/70">
                  Khóa vé an toàn, thong thả chọn combo bắp nước.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition hover:border-[#e50914]/50 hover:bg-white/15">
                <div className="mb-1.5 text-2xl">🍿</div>
                <h4 className="text-xs font-bold text-white">Điểm Thưởng VIP</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/70">
                  Tích CinePoints đổi vé xem phim và combo miễn phí.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Live Stats */}
          <div className="relative z-10 flex flex-wrap items-center gap-6 border-t border-white/15 pt-5 text-xs text-white/75">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white">45+</span> Cụm rạp đối tác
            </div>
            <div className="h-3 w-px bg-white/30" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#f5b50a]">★ 4.9/5</span> từ 120,000+ khán giả
            </div>
            <div className="h-3 w-px bg-white/30" />
            <div className="flex items-center gap-1.5 text-white/70">
              <Icon name="shield" size={14} color="#46d38a" /> Bảo mật chuẩn SSL 256-bit
            </div>
          </div>
        </section>

        {/* ================= RIGHT INTERACTIVE AUTH FORM ================= */}
        <section className="relative z-10 grid place-items-center lg:col-span-6 xl:col-span-5">
          <div className="w-full max-w-[460px]">
            {/* Top Brand Logo for Mobile */}
            <div className="mb-6 text-center lg:hidden">
              <Link
                to="/home"
                className="inline-block text-2xl font-black tracking-wider text-slate-900"
              >
                CINE<span className="text-[#e50914]">HUB</span>
              </Link>
              <p className="mt-1 text-xs text-slate-600">Nền tảng đặt vé điện ảnh thế hệ mới</p>
            </div>

            {/* Bright Frosted Glass Card */}
            <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(45,35,25,0.09)] backdrop-blur-xl sm:p-9">
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
                    className="group mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#e50914]"
                  >
                    <span className="transition group-hover:-translate-x-1">←</span>
                    Quay lại đăng nhập
                  </button>

                  <div className="text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#e50914]/30 bg-[#e50914]/10 text-[#e50914] shadow-sm">
                      <Icon name="key" size={26} />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                      Khôi phục mật khẩu
                    </h1>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Nhập email đã đăng ký. CineHub sẽ gửi hướng dẫn kèm liên kết an toàn để đặt
                      lại mật khẩu trong vòng 15 phút.
                    </p>
                  </div>

                  {resetSent ? (
                    <div className="mt-7 text-center">
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 p-5">
                        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                          <Icon name="check" size={20} />
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-slate-900">Đã gửi hướng dẫn!</h3>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">
                          Nếu email <b className="text-slate-900">{forgotEmail}</b> tồn tại trong hệ
                          thống, một liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.
                        </p>
                        <p className="mt-3 text-[11px] text-slate-500">
                          💡 Đừng quên kiểm tra cả thư mục <b>Spam / Thư rác</b> nếu chưa thấy
                          email.
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={submitForgot}
                          disabled={resetCooldown > 0 || forgotSending}
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resetCooldown > 0
                            ? `Gửi lại sau ${resetCooldown}s`
                            : 'Gửi lại email khôi phục'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentMode('login')}
                          className="w-full rounded-xl bg-[#e50914] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#b81d24]"
                        >
                          Về trang đăng nhập
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitForgot} noValidate className="mt-7 space-y-4">
                      <div>
                        <label className="block text-xs font-bold tracking-wide text-slate-700 uppercase">
                          Địa chỉ Email
                        </label>
                        <div className="relative mt-2">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                            className={`w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#e50914] focus:ring-4 focus:ring-red-500/10 shadow-xs ${forgotError ? 'border-red-500' : 'border-slate-300'}`}
                          />
                        </div>
                        {forgotError && (
                          <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-600">
                            {forgotError}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={forgotSending}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {forgotSending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                  <div className="relative mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 text-center">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('login')}
                      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${isLogin ? 'bg-[#e50914] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Icon name="user" size={15} />
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentMode('register')}
                      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${isRegister ? 'bg-[#e50914] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Icon name="sparkles" size={15} />
                      Tạo tài khoản
                    </button>
                  </div>

                  {/* Header Title */}
                  <div className="mb-6">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {isLogin ? 'Chào mừng trở lại' : 'Trở thành Hội viên VIP'}
                    </h1>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {isLogin
                        ? 'Nhập thông tin tài khoản CineHub để tiếp tục đặt vé.'
                        : 'Khởi tạo tài khoản miễn phí chỉ trong 30 giây.'}
                    </p>
                  </div>

                  {/* Server Form Error Banner */}
                  {formError && (
                    <div
                      role="alert"
                      className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700"
                    >
                      <span className="mt-0.5 shrink-0 text-red-600">
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
                        <label className="block text-xs font-bold tracking-wide text-slate-700 uppercase">
                          Họ và tên
                        </label>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="user" size={18} />
                          </span>
                          <input
                            type="text"
                            value={f.name}
                            onChange={(e) => setField('name')(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            autoComplete="name"
                            className={`w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#e50914] focus:ring-4 focus:ring-red-500/10 shadow-xs ${err.name ? 'border-red-500' : 'border-slate-300'}`}
                          />
                        </div>
                        {err.name && (
                          <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                            {err.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Email Field */}
                    <div>
                      <label className="block text-xs font-bold tracking-wide text-slate-700 uppercase">
                        Email
                      </label>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon name="mail" size={18} />
                        </span>
                        <input
                          type="email"
                          value={f.email}
                          onChange={(e) => setField('email')(e.target.value)}
                          placeholder="ten@email.com"
                          autoComplete="email"
                          className={`w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#e50914] focus:ring-4 focus:ring-red-500/10 shadow-xs ${err.email ? 'border-red-500' : 'border-slate-300'}`}
                        />
                      </div>
                      {err.email && (
                        <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                          {err.email}
                        </p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold tracking-wide text-slate-700 uppercase">
                          Mật khẩu
                        </label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentMode('forgot');
                              setForgotEmail(f.email);
                            }}
                            className="text-xs font-bold text-[#e50914] transition hover:underline"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                          className={`w-full rounded-xl border bg-white py-3.5 pr-11 pl-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#e50914] focus:ring-4 focus:ring-red-500/10 shadow-xs ${err.pw ? 'border-red-500' : 'border-slate-300'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-700"
                        >
                          <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
                        </button>
                      </div>
                      {err.pw && (
                        <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                          {err.pw}
                        </p>
                      )}

                      {/* Password Strength Indicator (Register only) */}
                      {isRegister && f.pw.length > 0 && pwStrength && (
                        <div className="mt-2.5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
                            <span className="font-extrabold" style={{ color: pwStrength.color }}>
                              {pwStrength.label}
                            </span>
                          </div>
                          {/* 4 Segmented Progress Bar */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`h-1.5 rounded-full transition-all duration-300 ${step <= pwStrength.score ? pwStrength.barClass : 'bg-slate-200'}`}
                              />
                            ))}
                          </div>
                          {/* Requirements Checklist */}
                          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-medium">
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.length ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                            >
                              {pwStrength.checks.length ? '✓' : '•'} Từ 8 ký tự
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.mixedCase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                            >
                              {pwStrength.checks.mixedCase ? '✓' : '•'} Hoa & thường
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.numbers ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                            >
                              {pwStrength.checks.numbers ? '✓' : '•'} Chứa chữ số
                            </span>
                            <span
                              className={`flex items-center gap-1 ${pwStrength.checks.special ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
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
                          <label className="block text-xs font-bold tracking-wide text-slate-700 uppercase">
                            Xác nhận mật khẩu
                          </label>
                          {f.pw2.length > 0 && (
                            <span
                              className={`text-[11px] font-bold ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                              {passwordsMatch ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                            </span>
                          )}
                        </div>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="lock" size={18} />
                          </span>
                          <input
                            type={showPw2 ? 'text' : 'password'}
                            value={f.pw2}
                            onChange={(e) => setField('pw2')(e.target.value)}
                            placeholder="Nhập lại mật khẩu"
                            autoComplete="new-password"
                            className={`w-full rounded-xl border bg-white py-3.5 pr-11 pl-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#e50914] focus:ring-4 focus:ring-red-500/10 shadow-xs ${err.pw2 ? 'border-red-500' : 'border-slate-300'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw2(!showPw2)}
                            aria-label={showPw2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-700"
                          >
                            <Icon name={showPw2 ? 'eyeOff' : 'eye'} size={18} />
                          </button>
                        </div>
                        {err.pw2 && (
                          <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
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
                          className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          <input
                            id={rememberId}
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[#e50914] accent-[#e50914] focus:ring-0"
                          />
                          Ghi nhớ phiên đăng nhập trên thiết bị này
                        </label>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] via-[#ea1d27] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-red-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                    <div className="w-full border-t border-slate-200" />
                    <span className="absolute bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">
                      Hoặc tiếp tục với
                    </span>
                  </div>

                  {/* Single Google Sign-In Button */}
                  <div className="flex justify-center w-full">
                    <div id="google-btn-slot" className="w-full flex justify-center min-h-[44px]">
                      <button
                        type="button"
                        disabled={googleLoading}
                        onClick={() => {
                          if (window.google?.accounts?.id) {
                            window.google.accounts.id.prompt();
                          } else {
                            setFormError(
                              'Đang khởi động dịch vụ Google, vui lòng thử lại sau vài giây.',
                            );
                          }
                        }}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3 px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] disabled:opacity-50"
                      >
                        <GoogleIcon />
                        {googleLoading
                          ? 'Đang xác thực tài khoản...'
                          : isRegister
                            ? 'Đăng ký bằng Google'
                            : 'Đăng nhập bằng Google'}
                      </button>
                    </div>
                  </div>

                  {/* Terms & Privacy footer */}
                  <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
                    Bằng việc tiếp tục, bạn đồng ý với{' '}
                    <span className="font-semibold text-slate-600 hover:underline cursor-pointer">
                      Điều khoản dịch vụ
                    </span>{' '}
                    và{' '}
                    <span className="font-semibold text-slate-600 hover:underline cursor-pointer">
                      Chính sách bảo mật
                    </span>{' '}
                    của CineHub.
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
