import { useEffect, useRef, useState } from 'react';
import { avatar, movies } from '../data';
import { go, Link } from '../router';
import { useStore } from '../store';
import { Icon } from './ui';
import { askCineBot, resetCineBotSession } from '../services/chatbotApi';
import type { ChatReply } from '../services/chatbotApi';

export function Header({ path }: { path: string }) {
  const { user, logout } = useStore();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [menu, setMenu] = useState(false);
  const [drop, setDrop] = useState(false);
  const results = q.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const nav = [
    ['/home', 'Phim'],
    ['/showtimes', 'Lịch chiếu'],
    ['/my-tickets', 'Vé của tôi'],
  ];
  const on = (p: string) => path === p || (p === '/home' && path.startsWith('/movie'));

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-[rgba(15,23,42,0.62)] shadow-[0_10px_40px_rgba(0,0,0,0.16)] backdrop-blur-[20px] backdrop-saturate-150">
      <div className="mx-auto flex h-[74px] max-w-[1400px] items-center gap-4 px-5 md:gap-6 md:px-9">
        <button
          onClick={() => setMenu(!menu)}
          aria-label="Menu"
          className="rounded-full p-2 text-white/70 hover:bg-white/5 lg:hidden"
        >
          <Icon name={menu ? 'close' : 'menu'} />
        </button>
        <Link
          to="/home"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="CineHub trang chủ"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e50914] text-white shadow-[0_0_25px_rgba(229,9,20,.25)]">
            <Icon name="play" size={19} />
          </span>
          <span className="text-[21px] font-extrabold tracking-[-.04em]">
            CINE<span className="text-[#e50914]">HUB</span>
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-8 text-sm font-semibold lg:flex">
          {nav.map(([p, t]) => (
            <Link
              key={p}
              to={p}
              className={on(p) ? 'text-white' : 'text-white/55 hover:text-white'}
            >
              {t}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto hidden max-w-[360px] flex-1 sm:block">
          <div className="glass-control flex items-center gap-3 rounded-full px-4 py-2.5 text-white/55 focus-within:border-white/35">
            <Icon name="search" size={18} />
            <input
              aria-label="Tìm kiếm phim"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 120)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Tìm phim, rạp chiếu..."
            />
          </div>
          {focus && q.trim() && (
            <div className="glass-panel absolute inset-x-0 top-[52px] overflow-hidden rounded-2xl shadow-2xl">
              {results.length === 0 && (
                <p className="px-4 py-4 text-sm text-white/40">Không tìm thấy phim phù hợp.</p>
              )}
              {results.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={() => {
                    setQ('');
                    go(`/movie/${m.id}`);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                >
                  <img src={m.poster} alt="" className="h-12 w-8 rounded object-cover" />
                  <span>
                    <b className="block text-sm">{m.title}</b>
                    <small className="text-white/40">{m.genre}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {user ? (
          <div className="relative ml-auto sm:ml-0">
            <button
              onClick={() => setDrop(!drop)}
              aria-label="Tài khoản"
              className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/15"
            >
              <img
                src={user.photoURL || avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </button>
            {drop && (
              <div
                className="glass-panel absolute right-0 top-12 w-56 overflow-hidden rounded-2xl shadow-2xl"
                onClick={() => setDrop(false)}
              >
                <div className="border-b border-white/8 px-4 py-3">
                  <b className="block text-sm">{user.name}</b>
                  <small className="text-white/40">{user.email}</small>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5"
                >
                  <Icon name="user" size={17} /> Hồ sơ của tôi
                </Link>
                <Link
                  to="/my-tickets"
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5"
                >
                  <Icon name="ticket" size={17} /> Vé của tôi
                </Link>
                <button
                  onClick={() => {
                    logout();
                    go('/home');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white/60 hover:bg-white/5"
                >
                  <Icon name="logout" size={17} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link
              to="/register"
              className="hidden rounded-lg px-4 py-2.5 text-sm font-bold text-white/70 hover:text-white md:block"
            >
              Đăng ký
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-[#e50914] px-5 py-2.5 text-sm font-extrabold hover:bg-[#ff101c]"
            >
              Đăng nhập
            </Link>
          </div>
        )}
        <button
          onClick={() => window.dispatchEvent(new Event('cinehub:open-chat'))}
          aria-label="Hỏi CineBot AI"
          title="Hỏi CineBot AI"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[.06] text-white/70 transition hover:border-[#e50914]/60 hover:bg-[#e50914]/15 hover:text-white"
        >
          <Icon name="chat" size={18} />
        </button>
      </div>
      {menu && (
        <nav
          className="border-t border-white/10 bg-[rgba(10,13,20,0.88)] px-5 py-3 backdrop-blur-2xl lg:hidden"
          onClick={() => setMenu(false)}
        >
          {nav.map(([p, t]) => (
            <Link key={p} to={p} className="block py-3 text-sm font-semibold text-white/70">
              {t}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const cols: [string, string[]][] = [
    ['Khám phá', ['Phim đang chiếu', 'Phim sắp chiếu', 'Lịch chiếu', 'Hệ thống rạp']],
    ['Hỗ trợ', ['Trung tâm trợ giúp', 'Chính sách hoàn vé', 'Liên hệ', 'Câu hỏi thường gặp']],
    ['Về CineHub', ['Giới thiệu', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Tuyển dụng']],
  ];
  return (
    <footer className="mt-10 border-t border-white/15 bg-[rgba(8,10,14,0.62)] backdrop-blur-2xl">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-9">
        <div>
          <b className="text-xl">
            CINE<span className="text-[#e50914]">HUB</span>
          </b>
          <p className="mt-3 max-w-[260px] text-sm leading-6 text-white/35">
            Đặt vé xem phim nhanh, chọn ghế trực tiếp, thanh toán trong một phút.
          </p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <h3 className="text-sm font-extrabold">{h}</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/40">
              {links.map((l) => (
                <li key={l}>
                  <a href="#/home" className="hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8 py-5 text-center text-xs text-white/25">
        © 2026 CineHub. Bảo lưu mọi quyền.
      </div>
    </footer>
  );
}

type Msg = {
  from: 'bot' | 'me';
  text: string;
  response?: ChatReply;
  error?: boolean;
};

export function Chatbot({ lift }: { lift?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: 'bot',
      text: 'Chào bạn, mình là CineBot. Mình có thể tra phim, lịch chiếu và giá vé theo dữ liệu CineHub.',
    },
  ]);
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, open]);
  useEffect(() => {
    const reveal = () => setOpen(true);
    window.addEventListener('cinehub:open-chat', reveal);
    return () => window.removeEventListener('cinehub:open-chat', reveal);
  }, []);

  const send = async (t: string) => {
    if (!t.trim() || typing) return;
    setMsgs((m) => [...m, { from: 'me', text: t }]);
    setText('');
    setTyping(true);
    try {
      const response = await askCineBot(t);
      setMsgs((m) => [...m, { from: 'bot', text: response.reply, response }]);
    } catch (error) {
      setMsgs((m) => [
        ...m,
        {
          from: 'bot',
          text:
            error instanceof Error ? error.message : 'CineBot đang gặp sự cố. Vui lòng thử lại.',
          error: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className={`fixed right-5 z-[60] ${lift ? 'bottom-28' : 'bottom-5'}`}>
      {open && (
        <div className="chat-panel mb-4 flex h-[min(680px,calc(100dvh-120px))] w-[min(410px,calc(100vw-32px))] flex-col overflow-hidden rounded-[26px] border border-white/20 bg-[#10131b] shadow-[0_28px_100px_rgba(0,0,0,.7)] ring-1 ring-black/40">
          <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(120deg,#7f1325,#df1830_55%,#9e2445)] px-5 py-4">
            <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
                <Icon name="sparkles" size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-base tracking-tight">CineBot</b>
                <small className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/80">
                  <i className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
                  DB-first · Gemini tuỳ chọn
                </small>
              </div>
              <button
                onClick={() => {
                  if (typing) return;
                  resetCineBotSession();
                  setMsgs([
                    {
                      from: 'bot',
                      text: 'Cuộc trò chuyện mới đã bắt đầu. Mình có thể giúp bạn tìm phim và lịch chiếu.',
                    },
                  ]);
                }}
                disabled={typing}
                className="rounded-lg border border-white/15 px-2.5 py-2 text-[10px] font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
              >
                Cuộc trò chuyện mới
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng chat"
                className="rounded-xl border border-white/15 bg-black/10 p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>
          <div
            className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,rgba(137,32,55,.18),transparent_55%)] p-4"
            aria-live="polite"
          >
            {msgs.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`max-w-[88%] rounded-2xl border px-4 py-3 text-[13px] leading-5 shadow-sm ${m.from === 'me' ? 'ml-auto rounded-br-md border-[#f04459]/50 bg-[linear-gradient(135deg,#b9142d,#e32640)] text-white' : `rounded-bl-md border-white/10 bg-[#202530] text-white/90 ${m.error ? 'border-rose-400/30 text-rose-100' : ''}`}`}
                >
                  {m.text}
                </div>
                {m.response && (
                  <div className="ml-1 max-w-[90%] space-y-2">
                    <span className="inline-flex rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-semibold text-white/55">
                      {m.response.responseSource === 'gemini'
                        ? 'Gemini · DB context'
                        : 'Dữ liệu CineHub'}
                    </span>
                    {m.response.aiNotice && (
                      <p className="text-[11px] text-amber-200/80">{m.response.aiNotice}</p>
                    )}
                    {m.response.diagnostic && (
                      <p className="rounded-lg border border-amber-300/15 bg-amber-300/[.06] p-2 text-[11px] text-amber-100/80">
                        {m.response.diagnostic}
                      </p>
                    )}
                    {m.response.movie && (
                      <Link
                        to={`/movie/${m.response.movie.id}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] p-2.5 transition hover:border-[#f5b50a]/40"
                      >
                        {m.response.movie.posterUrl && (
                          <img
                            src={m.response.movie.posterUrl}
                            alt=""
                            className="h-14 w-10 rounded-md object-cover"
                          />
                        )}
                        <span className="min-w-0">
                          <b className="block truncate text-xs">{m.response.movie.title}</b>
                          <small className="mt-1 block text-[10px] text-white/50">
                            {m.response.movie.genres.join(' · ')}
                          </small>
                        </span>
                        <Icon name="chevron" size={15} />
                      </Link>
                    )}
                    {m.response.movies.map((movie) => (
                      <Link
                        key={movie.id}
                        to={`/movie/${movie.id}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] p-2.5 transition hover:border-[#f5b50a]/40"
                      >
                        {movie.posterUrl && (
                          <img
                            src={movie.posterUrl}
                            alt=""
                            className="h-14 w-10 rounded-md object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-xs">{movie.title}</b>
                          <small className="mt-1 block text-[10px] text-white/50">
                            {movie.genres.join(' · ')}
                          </small>
                        </span>
                        <Icon name="chevron" size={15} />
                      </Link>
                    ))}
                    {m.response.showtimes.map((showtime) => (
                      <Link
                        key={showtime.id}
                        to={`/showtimes?movie=${showtime.movie.id}`}
                        className="block rounded-xl border border-white/10 bg-white/[.06] p-3 transition hover:border-[#f5b50a]/40"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <b className="text-sm text-[#f5b50a]">
                            {showtime.time} · {showtime.date}
                          </b>
                          <small className="text-[10px] text-white/55">{showtime.format}</small>
                        </span>
                        <span className="mt-1 block truncate text-xs font-semibold">
                          {showtime.movie.title}
                        </span>
                        <small className="mt-1 block truncate text-[10px] text-white/50">
                          {showtime.cinema.name}
                        </small>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="w-fit rounded-2xl rounded-bl-md border border-white/10 bg-[#202530] px-4 py-3 text-xs text-white/65">
                CineBot đang tra dữ liệu...
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {['Phim nào đang chiếu?', 'Suất chiếu tối nay', 'Giá vé'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => void send(suggestion)}
                disabled={typing}
                className="shrink-0 rounded-full border border-white/15 bg-white/[.06] px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:border-[#f5b50a]/50 hover:bg-[#f5b50a]/10 hover:text-white disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-white/10 bg-black/20 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Tin nhắn"
              placeholder="Hỏi phim, suất chiếu, giá vé..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1b202a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#f5b50a]/60"
            />
            <button
              type="submit"
              disabled={typing || !text.trim()}
              aria-label="Gửi"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e50914] text-white shadow-[0_5px_18px_rgba(229,9,20,.3)] transition hover:bg-[#ff2632] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="send" size={17} />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Mở chatbot AI"
        className="relative ml-auto grid h-14 w-14 place-items-center rounded-full border border-white/35 bg-[linear-gradient(145deg,#ff4857,#c60018)] text-white shadow-[0_12px_35px_rgba(229,9,20,.58),0_0_0_7px_rgba(229,9,20,.12)] transition hover:scale-105 hover:shadow-[0_14px_42px_rgba(229,9,20,.72),0_0_0_9px_rgba(229,9,20,.15)]"
      >
        <Icon name={open ? 'close' : 'chat'} size={24} />
      </button>
    </div>
  );
}
