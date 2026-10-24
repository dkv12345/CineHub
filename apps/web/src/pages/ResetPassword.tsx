import { useEffect, useState } from 'react';
import { go, Link } from '../router';
import { Icon } from '../components/ui';
import * as authApi from '../services/authApi';

const MIN_PASSWORD = 8;
const REDIRECT_DELAY_MS = 3000;

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

/**
 * Opened from the link in the reset e-mail (`#/reset-password?token=...`).
 */
export default function ResetPassword({ token }: { token: string }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!done) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          go('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  const pwStrength = calculatePasswordStrength(pw);
  const passwordsMatch = pw2.length > 0 && pw === pw2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation: Record<string, string> = {};
    if (pw.length < MIN_PASSWORD) {
      validation.pw = `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`;
    }
    if (pw2 !== pw) {
      validation.pw2 = 'Mật khẩu xác nhận không trùng khớp.';
    }

    setErr(validation);
    setFormError('');
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword: pw });
      setDone(true);
    } catch (error) {
      setFormError(authApi.authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Missing or invalid token parameter
  if (!token) {
    return (
      <main className="relative grid min-h-[calc(100vh-74px)] place-items-center overflow-hidden bg-[#090b10] px-5 py-12 text-[#f1f3f7]">
        <div className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#121620]/85 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ff5a63]/40 bg-[#ff5a63]/15 text-[#ff5a63]">
            <Icon name="alert" size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
            Liên kết không hợp lệ
          </h1>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Liên kết đặt lại mật khẩu này đã hết hạn hoặc không đầy đủ thông tin bảo mật. Vui lòng
            yêu cầu một liên kết mới.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#e50914] py-3 text-xs font-bold text-white transition hover:bg-[#b81d24]"
            >
              Yêu cầu liên kết mới
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success state after updating password
  if (done) {
    return (
      <main className="relative grid min-h-[calc(100vh-74px)] place-items-center overflow-hidden bg-[#090b10] px-5 py-12 text-[#f1f3f7]">
        <div
          role="status"
          className="w-full max-w-[460px] rounded-3xl border border-[#46d38a]/30 bg-[#121620]/90 p-8 text-center shadow-[0_25px_65px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#46d38a]/40 bg-[#46d38a]/15 text-3xl text-[#46d38a] shadow-[0_0_30px_rgba(70,211,138,0.25)]">
            <Icon name="check" size={32} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Đặt lại mật khẩu thành công!
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            Mật khẩu mới của bạn đã được cập nhật an toàn. Toàn bộ các phiên đăng nhập cũ trên mọi
            thiết bị đã được thu hồi.
          </p>

          {/* Countdown indicator */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/70">
            <p>
              Tự động chuyển hướng về trang đăng nhập sau{' '}
              <b className="font-mono text-sm text-[#46d38a]">{countdown}s</b>…
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[#46d38a] transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 3) * 100}%` }}
              />
            </div>
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#e50914] py-3.5 text-xs font-extrabold text-white shadow-[0_4px_20px_rgba(229,9,20,0.35)] transition hover:brightness-110"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  // Active Reset Password Form
  return (
    <main className="relative grid min-h-[calc(100vh-74px)] place-items-center overflow-hidden bg-[#090b10] px-4 py-12 text-[#f1f3f7]">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[#e50914]/15 blur-[140px]"
      />

      <section className="relative z-10 w-full max-w-[460px] rounded-3xl border border-white/10 bg-[#121620]/85 p-7 shadow-[0_25px_65px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#e50914]/40 bg-[#e50914]/15 text-[#ff4d57] shadow-[0_0_25px_rgba(229,9,20,0.2)]">
            <Icon name="key" size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Tạo mật khẩu mới
          </h1>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Hãy thiết lập mật khẩu mạnh để bảo vệ tài khoản vé và đặc quyền thành viên CineHub.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-[#ff5a63]/40 bg-[#ff5a63]/10 p-3.5 text-xs font-medium text-[#ff7880]"
          >
            <span className="mt-0.5 shrink-0 text-[#ff5a63]">
              <Icon name="alert" size={16} />
            </span>
            <div className="flex-1 leading-5">{formError}</div>
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
              Mật khẩu mới
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                <Icon name="lock" size={18} />
              </span>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (err.pw) setErr((prev) => ({ ...prev, pw: '' }));
                }}
                placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
                autoComplete="new-password"
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

            {/* Live Password Strength Meter */}
            {pw.length > 0 && (
              <div className="mt-2.5 space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Độ mạnh mật khẩu:</span>
                  <span className="font-bold" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${step <= pwStrength.score ? pwStrength.barClass : 'bg-white/10'}`}
                    />
                  ))}
                </div>
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
                    {pwStrength.checks.numbers ? '✓' : '•'} Chữ số
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

          {/* Confirm Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                Xác nhận mật khẩu mới
              </label>
              {pw2.length > 0 && (
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
                value={pw2}
                onChange={(e) => {
                  setPw2(e.target.value);
                  if (err.pw2) setErr((prev) => ({ ...prev, pw2: '' }));
                }}
                placeholder="Nhập lại mật khẩu mới"
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

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] via-[#ea1d27] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-[0_4px_24px_rgba(229,9,20,0.38)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Đang lưu mật khẩu…
              </>
            ) : (
              'Cập nhật mật khẩu'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link
            to="/login"
            className="font-bold text-white/60 transition hover:text-white hover:underline"
          >
            ← Quay lại đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
