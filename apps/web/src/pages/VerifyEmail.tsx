import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { go, Link } from '../router';
import { useStore } from '../store';
import { Icon } from '../components/ui';
import * as authApi from '../services/authApi';

const LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Step 2 of registration: the user types the 6-digit OTP received by e-mail.
 * A correct code activates the account, signs the user in, and receives the welcome email.
 */
export default function VerifyEmail({ email, next }: { email: string; next: string }) {
  const { startSession } = useStore();
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const reset = () => {
    setDigits(Array(LENGTH).fill(''));
    inputs.current[0]?.focus();
  };

  const submit = async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      startSession(await authApi.verifyEmail({ email, code }));
      go(next);
    } catch (e) {
      if (authApi.authErrorCode(e) === 'ALREADY_VERIFIED') {
        go(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(authApi.authErrorMessage(e));
      reset();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const fill = (start: number, chars: string) => {
    const nextDigits = [...digits];
    chars.split('').forEach((c, i) => {
      if (start + i < LENGTH) nextDigits[start + i] = c;
    });
    setDigits(nextDigits);
    const last = Math.min(start + chars.length, LENGTH - 1);
    inputs.current[last]?.focus();
    const code = nextDigits.join('');
    if (code.length === LENGTH && nextDigits.every(Boolean)) void submit(code);
  };

  const onChange = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)));
      return;
    }
    fill(i, clean);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    fill(0, text);
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await authApi.resendVerification(email);
      setInfo('Mã xác thực mới đã được gửi thành công. Vui lòng kiểm tra hộp thư.');
      setCooldown(RESEND_SECONDS);
      reset();
    } catch (e) {
      setError(authApi.authErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <main className="relative grid min-h-[calc(100vh-74px)] place-items-center overflow-hidden bg-[#090b10] px-5 py-12 text-[#f1f3f7]">
        <div className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#121620]/85 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ff5a63]/40 bg-[#ff5a63]/15 text-[#ff5a63]">
            <Icon name="alert" size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
            Thiếu thông tin xác thực
          </h1>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Không tìm thấy thông tin email cần xác minh. Vui lòng đăng nhập hoặc tạo tài khoản mới
            để tiếp tục.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#e50914] py-3 text-xs font-bold text-white transition hover:bg-[#b81d24]"
            >
              Đăng ký tài khoản mới
            </Link>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold text-white transition hover:bg-white/10"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-[calc(100vh-74px)] place-items-center overflow-hidden bg-[#090b10] px-4 py-12 text-[#f1f3f7]">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[#e50914]/15 blur-[140px]"
      />

      <section className="relative z-10 w-full max-w-[500px] rounded-3xl border border-white/10 bg-[#121620]/85 p-7 text-center shadow-[0_25px_65px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10">
        {/* Animated envelope icon */}
        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#e50914]/40 bg-[#e50914]/15 text-[#ff4d57] shadow-[0_0_30px_rgba(229,9,20,0.25)]">
          <Icon name="mail" size={28} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4d57] opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-[#e50914]" />
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Xác thực tài khoản
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          CineHub đã gửi mã bảo mật 6 chữ số đến địa chỉ email:
          <br />
          <span className="mt-1 inline-block rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono font-bold text-white">
            {email}
          </span>
        </p>

        {/* 6-box OTP container */}
        <div className="mt-8 flex justify-center gap-2.5 sm:gap-3.5" onPaste={onPaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={digit}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={LENGTH}
              disabled={submitting}
              aria-label={`Chữ số ${i + 1}`}
              aria-invalid={!!error}
              className={`h-14 w-11 rounded-2xl border bg-white/[0.05] text-center font-mono text-2xl font-black text-white outline-none transition-all focus:scale-105 focus:border-[#e50914] focus:bg-[#e50914]/10 focus:ring-2 focus:ring-[#e50914]/20 disabled:opacity-50 sm:h-16 sm:w-14 ${digit ? 'border-[#e50914]/60 bg-white/[0.08]' : error ? 'border-[#ff5a63]' : 'border-white/15'}`}
            />
          ))}
        </div>

        {/* Live Status and Alerts */}
        <div aria-live="polite" className="mt-5 min-h-[2.5rem]">
          {error && (
            <div
              role="alert"
              className="flex items-center justify-center gap-2 rounded-xl border border-[#ff5a63]/40 bg-[#ff5a63]/10 px-3.5 py-2 text-xs font-semibold text-[#ff7880]"
            >
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          )}
          {!error && info && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[#46d38a]/40 bg-[#46d38a]/10 px-3.5 py-2 text-xs font-semibold text-[#46d38a]">
              <Icon name="check" size={15} />
              <span>{info}</span>
            </div>
          )}
          {submitting && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/60">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Đang xác minh mã OTP…
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={submitting || digits.some((d) => !d)}
          onClick={() => void submit(digits.join(''))}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b81d24] py-3.5 text-sm font-extrabold text-white shadow-[0_4px_24px_rgba(229,9,20,0.38)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Đang hoàn tất kích hoạt…' : 'Xác nhận & Đăng nhập'}
        </button>

        {/* Resend OTP Cooldown Row */}
        <div className="mt-7 flex flex-col items-center justify-center gap-2 border-t border-white/10 pt-6 text-xs">
          <p className="text-white/50">
            Chưa nhận được mã xác thực?{' '}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || resending}
              className="font-bold text-[#ff4d57] transition enabled:hover:text-[#ff7880] enabled:hover:underline disabled:cursor-not-allowed disabled:text-white/30"
            >
              {resending
                ? 'Đang gửi mã…'
                : cooldown > 0
                  ? `Gửi lại sau (${cooldown}s)`
                  : 'Gửi lại mã ngay'}
            </button>
          </p>
          <p className="text-[11px] text-white/35">
            💡 Kiểm tra hộp thư chính, thư mục Quảng cáo hoặc Thư rác (Spam).
          </p>
          <Link
            to={`/register?next=${encodeURIComponent(next)}`}
            className="mt-2 text-[11px] font-semibold text-white/50 transition hover:text-white hover:underline"
          >
            ← Sai địa chỉ email? Đăng ký lại
          </Link>
        </div>
      </section>
    </main>
  );
}
