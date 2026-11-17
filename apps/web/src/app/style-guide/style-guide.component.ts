import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ch-style-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="min-h-screen w-full bg-[#020617] text-white p-6 md:p-10 font-['Manrope',sans-serif] selection:bg-[#e50914] selection:text-white"
    >
      <div class="mx-auto max-w-[1440px] space-y-8">
        <!-- Figure Header Banner -->
        <header
          class="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-5 gap-4"
        >
          <div>
            <div class="flex items-center gap-2.5">
              <span class="h-6 w-1 rounded-[1px] bg-[#e50914] shadow-[0_0_12px_#e50914]"></span>
              <span class="text-xs font-black uppercase tracking-[0.25em] text-[#e50914]">
                CINEHUB DESIGN SYSTEM SPECIFICATION
              </span>
            </div>
            <h1 class="mt-1 text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Design Tokens: Color Palette, Typography & Iconography
            </h1>
          </div>
          <div class="text-left sm:text-right text-xs font-semibold text-slate-400">
            <span
              class="inline-block rounded-[3px] bg-white/5 border border-white/10 px-2.5 py-1 text-slate-300"
            >
              Figure 5.2 Reference
            </span>
          </div>
        </header>

        <!-- ══════════════════════════════════════════════════════════
             SECTION 01: COLOR PALETTE
        ══════════════════════════════════════════════════════════ -->
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <span
              class="rounded-[2px] bg-[#e50914] px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white"
            >
              01
            </span>
            <h2 class="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
              COLOR PALETTE & SEMANTIC TOKENS
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- 1. Background Canvas -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="grid grid-cols-2 gap-2 h-20 rounded-[4px] overflow-hidden border border-white/10 p-1 bg-black/40"
              >
                <div
                  class="h-full rounded-[2px] bg-[#020617] border border-white/10 flex items-center justify-center"
                >
                  <span class="text-[9px] font-mono text-slate-400">#020617</span>
                </div>
                <div
                  class="h-full rounded-[2px] bg-[#0b0f19] border border-white/10 flex items-center justify-center"
                >
                  <span class="text-[9px] font-mono text-slate-400">#0b0f19</span>
                </div>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Background Canvas
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">
                  #020617 · #0b0f19
                </p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Page background that maximizes contrast for poster & backdrop imagery.
                </p>
              </div>
            </div>

            <!-- 2. Surface Secondary (Glassmorphic) -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="relative h-20 rounded-[4px] overflow-hidden border border-white/10 p-2 flex items-center justify-center bg-gradient-to-br from-red-600/30 via-slate-900 to-amber-500/20"
              >
                <div
                  class="absolute -right-4 -top-4 w-12 h-12 rounded-full bg-red-600/50 blur-lg"
                ></div>
                <div
                  class="relative z-10 w-full py-1.5 px-3 rounded-[3px] bg-[#0f172a]/75 backdrop-blur-[12px] border border-white/20 text-center shadow-md"
                >
                  <span class="text-[10px] font-mono font-bold text-white"
                    >rgba(15,23,42,0.75)</span
                  >
                </div>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Surface Secondary
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">
                  #0f172a / Glass Blur
                </p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Semi-transparent glass panels, modal dialogues and bottom checkout sheets.
                </p>
              </div>
            </div>

            <!-- 3. Primary Brand Red -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="h-20 rounded-[4px] bg-[#e50914] shadow-[0_0_25px_rgba(229,9,20,0.5)] flex items-center justify-center"
              >
                <span class="text-xs font-mono font-black text-white">#e50914</span>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Primary Brand Red
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">#e50914</p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Primary CTA buttons, brand logo badge and theatrical highlights.
                </p>
              </div>
            </div>

            <!-- 4. Accent Gold / Marquee Amber -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="grid grid-cols-2 gap-2 h-20 rounded-[4px] overflow-hidden border border-white/10 p-1 bg-black/40"
              >
                <div
                  class="h-full rounded-[2px] bg-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.4)] flex items-center justify-center"
                >
                  <span class="text-[9px] font-mono font-black text-slate-950">#fbbf24</span>
                </div>
                <div
                  class="h-full rounded-[2px] bg-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center"
                >
                  <span class="text-[9px] font-mono font-black text-slate-950">#f59e0b</span>
                </div>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Accent Gold / Marquee
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">
                  #fbbf24 · #f59e0b
                </p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  VIP auditorium seats, active filter pills, countdown timers and IMDb badges.
                </p>
              </div>
            </div>

            <!-- 5. Success / Selected -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="h-20 rounded-[4px] bg-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center"
              >
                <span class="text-xs font-mono font-black text-slate-950">#10b981</span>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Success / Selected
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">#10b981</p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Seats actively selected by user, valid gate admission QR tickets.
                </p>
              </div>
            </div>

            <!-- 6. Warning / Reserved -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="h-20 rounded-[4px] bg-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center"
              >
                <span class="text-xs font-mono font-black text-slate-950">#f59e0b</span>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Warning / Reserved
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">#f59e0b</p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Temporary 15-minute seat locks, expiring timers and gap warnings.
                </p>
              </div>
            </div>

            <!-- 7. Danger / Sold -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="h-20 rounded-[4px] bg-[#f43f5e] shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center"
              >
                <span class="text-xs font-mono font-black text-white">#f43f5e</span>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Danger / Sold
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">#f43f5e</p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Occupied seats, passback fraud violations, payment cancellation timeouts.
                </p>
              </div>
            </div>

            <!-- 8. Neutral / Borders -->
            <div
              class="glass-card rounded-[6px] p-4 flex flex-col justify-between border border-white/10 shadow-lg"
            >
              <div
                class="grid grid-cols-2 gap-2 h-20 rounded-[4px] overflow-hidden border border-white/10 p-1 bg-black/40"
              >
                <div class="h-full rounded-[2px] bg-[#94a3b8] flex items-center justify-center">
                  <span class="text-[9px] font-mono font-black text-slate-950">#94a3b8</span>
                </div>
                <div
                  class="h-full rounded-[2px] bg-white/15 border border-white/20 flex items-center justify-center"
                >
                  <span class="text-[9px] font-mono font-bold text-white">white/15</span>
                </div>
              </div>
              <div class="mt-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Neutral / Borders
                </h3>
                <p class="mt-0.5 font-mono text-[11px] font-bold text-amber-400">
                  #94a3b8 · rgba(255,255,255,0.15)
                </p>
                <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                  Secondary body typography, metadata labels and frosted glass stroke borders.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════
             SECTION 02: TYPOGRAPHY
        ══════════════════════════════════════════════════════════ -->
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <span
              class="rounded-[2px] bg-[#e50914] px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white"
            >
              02
            </span>
            <h2 class="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
              TYPOGRAPHY & NUMERIC SYSTEM
            </h2>
          </div>

          <div class="glass-panel rounded-[6px] p-6 space-y-6 border border-white/10 shadow-xl">
            <!-- Row 1: Barlow Condensed & Oswald -->
            <div class="border-b border-white/10 pb-6">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span class="text-xs font-black uppercase tracking-widest text-[#e50914]">
                  DISPLAY & FILM TITLES · BARLOW CONDENSED (700-900) & OSWALD
                </span>
                <span class="text-[11px] font-mono text-slate-400"
                  >Class: .display, .film-title</span
                >
              </div>
              <div class="space-y-2">
                <div
                  class="film-title text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-white"
                >
                  DUNE 3 · AVENGERS: DOOMSDAY
                </div>
                <div
                  class="display text-2xl sm:text-3xl font-black uppercase tracking-wide text-amber-400"
                >
                  TOP 10 PHIM CHIẾU RẠP THỊNH HÀNH TUẦN QUA
                </div>
              </div>
            </div>

            <!-- Row 2: Manrope -->
            <div class="border-b border-white/10 pb-6">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span class="text-xs font-black uppercase tracking-widest text-[#e50914]">
                  BODY TEXT & UI INPUTS · MANROPE (400-700)
                </span>
                <span class="text-[11px] font-mono text-slate-400">Default Sans-serif Family</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div class="rounded-[4px] bg-slate-900/60 p-3.5 border border-white/5">
                  <span class="text-[10px] font-mono font-bold text-amber-400 uppercase"
                    >11px · Metadata / Badges</span
                  >
                  <p class="mt-1 text-[11px] font-medium leading-relaxed text-slate-300">
                    CineHub mang đến trải nghiệm điện ảnh chuẩn quốc tế với phòng chiếu IMAX Laser.
                  </p>
                  <p class="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
                    Experience frictionless cinema ticketing with real-time seat reservation.
                  </p>
                </div>
                <div class="rounded-[4px] bg-slate-900/60 p-3.5 border border-white/5">
                  <span class="text-[10px] font-mono font-bold text-amber-400 uppercase"
                    >12px · Secondary Body</span
                  >
                  <p class="mt-1 text-[12px] font-medium leading-relaxed text-slate-200">
                    CineHub mang đến trải nghiệm điện ảnh chuẩn quốc tế với phòng chiếu IMAX Laser.
                  </p>
                  <p class="mt-1 text-[12px] font-medium leading-relaxed text-slate-400">
                    Experience frictionless cinema ticketing with real-time seat reservation.
                  </p>
                </div>
                <div class="rounded-[4px] bg-slate-900/60 p-3.5 border border-white/5">
                  <span class="text-[10px] font-mono font-bold text-amber-400 uppercase"
                    >14px · Primary UI & Forms</span
                  >
                  <p class="mt-1 text-[14px] font-semibold leading-relaxed text-white">
                    CineHub mang đến trải nghiệm điện ảnh chuẩn quốc tế với phòng chiếu IMAX Laser.
                  </p>
                  <p class="mt-1 text-[14px] font-semibold leading-relaxed text-slate-300">
                    Experience frictionless cinema ticketing with real-time seat reservation.
                  </p>
                </div>
              </div>
            </div>

            <!-- Row 3: Tabular Numerals -->
            <div>
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span class="text-xs font-black uppercase tracking-widest text-[#e50914]">
                  TABULAR NUMERALS · FONT-VARIANT-NUMERIC: TABULAR-NUMS
                </span>
                <span class="text-[11px] font-mono text-slate-400"
                  >Class: .tabular-nums (Zero-jitter counters)</span
                >
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div
                  class="rounded-[4px] bg-black/60 p-4 border border-white/10 flex flex-col justify-center items-center text-center"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >Transaction Price</span
                  >
                  <span class="mt-1 text-2xl font-black text-amber-400 tabular-nums"
                    >180.000 ₫</span
                  >
                  <span class="mt-0.5 text-[10px] text-slate-500 font-mono"
                    >Precision seat breakdown</span
                  >
                </div>
                <div
                  class="rounded-[4px] bg-black/60 p-4 border border-white/10 flex flex-col justify-center items-center text-center"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >Booking Reference</span
                  >
                  <span class="mt-1 text-2xl font-black text-white tabular-nums tracking-wider"
                    >#CNH-849204</span
                  >
                  <span class="mt-0.5 text-[10px] text-slate-500 font-mono"
                    >Cryptographic order identifier</span
                  >
                </div>
                <div
                  class="rounded-[4px] bg-black/60 p-4 border border-white/10 flex flex-col justify-center items-center text-center"
                >
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >Seat Hold Countdown</span
                  >
                  <span class="mt-1 text-2xl font-black text-[#e50914] tabular-nums tracking-widest"
                    >14:59</span
                  >
                  <span class="mt-0.5 text-[10px] text-slate-500 font-mono"
                    >Redis hold expiration timer</span
                  >
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════
             SECTION 03: ICONOGRAPHY
        ══════════════════════════════════════════════════════════ -->
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <span
              class="rounded-[2px] bg-[#e50914] px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white"
            >
              03
            </span>
            <h2 class="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
              ICONOGRAPHY SYSTEM
            </h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Group A: Functional Icons -->
            <div class="glass-panel rounded-[6px] p-5 border border-white/10 shadow-lg">
              <div class="mb-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Functional Icons (2px Stroke Inline SVG)
                </h3>
                <p class="text-[11px] text-slate-400">Crisp Lucide-compatible interface controls</p>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <!-- Search -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Search</span>
                </div>

                <!-- Calendar -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Calendar</span>
                </div>

                <!-- Clock -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Clock</span>
                </div>

                <!-- MapPin -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">MapPin</span>
                </div>

                <!-- Sparkles -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <path
                      d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"
                    />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Sparkles</span>
                </div>

                <!-- Chevron -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-amber-400/50 transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Chevron</span>
                </div>
              </div>
            </div>

            <!-- Group B: Cinema-Specific Custom Icons -->
            <div class="glass-panel rounded-[6px] p-5 border border-white/10 shadow-lg">
              <div class="mb-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-white">
                  Cinema-Specific Custom Visual Tokens
                </h3>
                <p class="text-[11px] text-slate-400">
                  Auditorium screen curvature, seat types & concessions
                </p>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <!-- Projector Screen Curve -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-[#e50914]/50 transition text-center"
                >
                  <svg
                    viewBox="0 0 100 24"
                    width="48"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    class="text-amber-400"
                  >
                    <path d="M 6 20 Q 50 4 94 20" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Screen Curve</span>
                  <span class="text-[9px] text-slate-500 font-mono">Seatmap Screen</span>
                </div>

                <!-- VIP Crown -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-[#e50914]/50 transition text-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <path d="M2 4l3 12h14l3-12-5 7-5-7-5 7-5-7z" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-amber-300">VIP Crown</span>
                  <span class="text-[9px] text-slate-500 font-mono">VIP Seat Matrix</span>
                </div>

                <!-- Sweetbox Couple Seat -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-[#e50914]/50 transition text-center"
                >
                  <svg
                    viewBox="0 0 32 24"
                    width="36"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-pink-400"
                  >
                    <rect x="2" y="6" width="28" height="14" rx="4" />
                    <path d="M16 6v14" />
                    <path d="M6 3v3M26 3v3" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-pink-300">Sweetbox Seat</span>
                  <span class="text-[9px] text-slate-500 font-mono">Couple Seat Double</span>
                </div>

                <!-- Popcorn / Drink Combo -->
                <div
                  class="flex flex-col items-center justify-center p-3 rounded-[4px] bg-slate-900/80 border border-white/5 hover:border-[#e50914]/50 transition text-center"
                >
                  <svg
                    viewBox="0 0 28 24"
                    width="32"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-amber-400"
                  >
                    <path d="M4 8l2 13h9l2-13H4z" />
                    <path d="M4 8c0-2 2-3 4-2 1-2 4-2 5 0 2-1 4 0 4 2" />
                    <path d="M20 7l1 14h4l1-14h-6z" />
                    <path d="M23 7V3l2-1" />
                  </svg>
                  <span class="mt-2 text-[10px] font-bold text-slate-300">Popcorn & Drink</span>
                  <span class="text-[9px] text-slate-500 font-mono">Concessions Menu</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class StyleGuideComponent {}
