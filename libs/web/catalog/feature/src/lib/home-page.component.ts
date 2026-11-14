import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { MovieCardComponent } from '@cinehub/web/catalog/ui';
import { AuthStore } from '@cinehub/web/core';
import type { Movie } from '@cinehub/web/shared/util';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import {
  buildShowtimesLink,
  buildShowtimesQueryParams,
  filterShowtimes,
  vietnamDate,
} from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-home-page',
  standalone: true,
  imports: [RouterLink, MovieCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <!-- 1. Hero Promotion Carousel Banner -->
      @if (banners.length > 0) {
        <section
          class="relative mx-auto min-h-[350px] sm:min-h-[480px] md:min-h-[600px] max-w-[1600px] overflow-hidden bg-[#020617] text-white"
          (mouseenter)="pauseCarousel()"
          (mouseleave)="resumeCarousel()"
          aria-roledescription="carousel"
          aria-label="Banner chương trình ưu đãi"
        >
          @for (slide of banners; track slide.id; let idx = $index) {
            <div
              class="absolute inset-0 transition-opacity duration-700"
              [class]="
                currentSlide() === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              "
            >
              <div class="absolute inset-0 overflow-hidden bg-[#020617]">
                <img
                  [src]="slide.image || slide.imageUrl"
                  [alt]="slide.title"
                  class="h-full w-full object-cover object-center"
                />
                <!-- Subtle cinematic vignette gradient -->
                <div
                  class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/40"
                ></div>
                <div
                  class="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#020617]/60 via-transparent to-transparent"
                ></div>
              </div>
            </div>
          }

          <!-- Slide Controls -->
          <div
            class="absolute bottom-6 right-5 z-20 flex items-center gap-3 md:bottom-8 md:right-9"
          >
            <button
              type="button"
              (click)="stepSlide(-1)"
              aria-label="Slide trước"
              class="grid h-10 w-10 place-items-center rounded-[4px] border border-white/10 bg-black/70 text-white shadow-xl backdrop-blur-md transition hover:bg-[#e50914] hover:border-transparent"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div class="flex gap-2">
              @for (slide of banners; track slide.id; let idx = $index) {
                <button
                  type="button"
                  (click)="currentSlide.set(idx)"
                  [attr.aria-label]="'Slide ' + (idx + 1)"
                  class="h-1 rounded-[1px] transition-all duration-300"
                  [class]="
                    currentSlide() === idx
                      ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : 'w-2.5 bg-white/40 hover:bg-white/70'
                  "
                ></button>
              }
            </div>

            <button
              type="button"
              (click)="stepSlide(1)"
              aria-label="Slide sau"
              class="grid h-10 w-10 place-items-center rounded-[4px] border border-white/10 bg-black/70 text-white shadow-xl backdrop-blur-md transition hover:bg-[#e50914] hover:border-transparent"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </section>
      }

      <!-- 2. Thanh QuickBooking Mua vé nhanh (Luxury Cinema Console) -->
      <div class="relative z-10 mx-auto mt-6 max-w-[1400px] px-5 md:mt-8 md:px-9">
        <section
          class="grid gap-4 rounded-[6px] border border-white/[0.12] bg-gradient-to-b from-[#101726]/95 via-[#090d17]/95 to-[#04060c]/98 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl md:grid-cols-[1.15fr_1.15fr_.8fr_.8fr_auto] md:items-end md:p-6"
          aria-label="Đặt vé nhanh"
        >
          <!-- Chọn phim -->
          <label class="min-w-0 text-[11px] font-black uppercase tracking-wider text-slate-300">
            CHỌN PHIM
            <div class="relative mt-2">
              <select
                [value]="quickMovieId()"
                (change)="onQuickMovieChange($event)"
                [disabled]="showtimesStore.loading() || quickMovies().length === 0"
                class="block h-[46px] w-full appearance-none rounded-[4px] border border-white/10 bg-[#070b13] py-2.5 pl-3.5 pr-10 text-sm font-bold text-white outline-none transition [color-scheme:dark] hover:border-white/30 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]"
              >
                @if (quickMovies().length === 0) {
                  <option value="">Chưa có phim có suất chiếu</option>
                } @else {
                  @for (m of quickMovies(); track m.id) {
                    <option [value]="m.slug || m.id" class="bg-slate-900 font-bold text-white">
                      {{ m.title }}
                    </option>
                  }
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn rạp -->
          <label class="min-w-0 text-[11px] font-black uppercase tracking-wider text-slate-300">
            CHỌN RẠP
            <div class="relative mt-2">
              <select
                [value]="quickCinemaId()"
                (change)="onQuickCinemaChange($event)"
                [disabled]="showtimesStore.loading() || quickMovies().length === 0"
                class="block h-[46px] w-full appearance-none rounded-[4px] border border-white/10 bg-[#070b13] py-2.5 pl-3.5 pr-10 text-sm font-bold text-white outline-none transition [color-scheme:dark] hover:border-white/30 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]"
              >
                <option value="" class="bg-slate-900 font-bold text-white">Tất cả rạp</option>
                @for (c of cinemaList(); track c.id) {
                  <option [value]="c.id" class="bg-slate-900 font-bold text-white">
                    {{ c.name }}
                  </option>
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn ngày -->
          <label class="min-w-0 text-[11px] font-black uppercase tracking-wider text-slate-300">
            CHỌN NGÀY
            <div class="relative mt-2">
              <select
                (change)="onQuickDayChange($event)"
                [value]="quickShowtimeDate()"
                [disabled]="showtimesStore.loading() || quickDateOptions().length === 0"
                class="block h-[46px] w-full appearance-none rounded-[4px] border border-white/10 bg-[#070b13] py-2.5 pl-3.5 pr-10 text-sm font-bold text-white outline-none transition [color-scheme:dark] hover:border-white/30 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] disabled:opacity-50"
              >
                @if (quickDateOptions().length === 0) {
                  <option value="" class="bg-slate-900 font-bold text-white">
                    Chưa có suất phù hợp
                  </option>
                } @else {
                  @for (d of quickDateOptions(); track d.date) {
                    <option [value]="d.date" class="bg-slate-900 font-bold text-white">
                      {{ d.label }}
                    </option>
                  }
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn suất -->
          <label class="min-w-0 text-[11px] font-black uppercase tracking-wider text-slate-400">
            CHỌN SUẤT
            <div class="relative mt-2">
              <select
                disabled
                class="block h-[46px] w-full appearance-none rounded-[4px] border border-white/5 bg-[#05080e]/60 py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-500 outline-none"
              >
                <option class="bg-slate-900">Xem tại bước sau</option>
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs"
                >▼</span
              >
            </div>
          </label>

          <!-- Nút Đặt Vé Nhanh -->
          <button
            type="button"
            (click)="submitQuickBooking()"
            [disabled]="
              showtimesStore.loading() || quickMovies().length === 0 || !quickShowtimeDate()
            "
            aria-label="Mua vé nhanh theo phim, rạp và ngày đã chọn"
            class="inline-flex h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-[4px] bg-gradient-to-r from-[#e50914] to-[#f6121d] px-7 text-sm font-extrabold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(229,9,20,0.5)] transition hover:from-[#f6121d] hover:to-[#ff2a36] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path
                d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a3 3 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-4z"
              />
            </svg>
            Mua vé nhanh
          </button>
          @if (!showtimesStore.loading() && quickMovies().length > 0 && !quickShowtimeDate()) {
            <p class="text-xs font-bold text-amber-200 md:col-span-full">
              Không có suất chiếu cho phim và rạp đã chọn.
            </p>
          }
        </section>
      </div>

      <!-- 3. Section Top Thịnh Hành (Giant Stylized Contour Numbering - Tubelix / Netflix Style) -->
      <section class="mx-auto max-w-[1400px] px-5 pt-10 md:px-9 md:pt-14">
        <div class="mb-8 flex items-end justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div class="flex items-center gap-3">
            <span class="h-7 w-1 rounded-[1px] bg-[#e50914] shadow-[0_0_12px_#e50914]"></span>
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.25em] text-[#e50914]">
                XU HƯỚNG BÌNH CHỌN
              </p>
              <h2 class="mt-0.5 text-2xl font-black uppercase tracking-wide text-white md:text-3xl">
                Top 10 Phim Thịnh Hành
              </h2>
            </div>
          </div>
          <a
            [routerLink]="buildShowtimesLink()"
            class="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 transition hover:text-[#e50914]"
          >
            <span>Xem lịch chiếu</span>
            <span class="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </div>

        <div
          class="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 pl-12 pr-6 md:-mx-9 md:pl-14 md:pr-9"
        >
          @for (m of trendingMovies(); track m.id; let idx = $index) {
            <article
              class="group relative flex w-[190px] shrink-0 snap-start flex-col transition duration-300 sm:w-[220px]"
            >
              <!-- Stylized Netflix/Tubelix Giant Red Contour Number -->
              <span
                class="pointer-events-none select-none absolute -left-6 bottom-12 z-20 font-black leading-none transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1"
                style="-webkit-text-stroke: 3px #e50914; color: #020617; text-shadow: 0 4px 25px rgba(229,9,20,0.6);"
                [class]="idx >= 9 ? 'text-[92px] tracking-tighter' : 'text-[112px]'"
              >
                {{ idx + 1 }}
              </span>

              <a
                [routerLink]="['/movie', m.id]"
                class="ml-8 relative block aspect-[2/3] overflow-hidden rounded-[4px] bg-[#0c1322] border border-white/[0.08] shadow-[0_12px_30px_rgba(0,0,0,0.85)] transition-all duration-500 group-hover:scale-105 group-hover:border-[#e50914]/60 group-hover:shadow-[0_16px_40px_rgba(229,9,20,0.35)]"
              >
                <img
                  [src]="m.poster"
                  [alt]="'Poster ' + m.title"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                ></div>
                <!-- Micro Badges -->
                <span
                  class="absolute top-2 left-2 rounded-[2px] bg-[#e50914] px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow"
                >
                  TOP {{ idx + 1 }}
                </span>
                <span
                  class="absolute top-2 right-2 rounded-[2px] bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/30 backdrop-blur-sm"
                >
                  ★ {{ m.rating }}
                </span>
                <span
                  class="absolute bottom-2 left-2 rounded-[2px] bg-white/20 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-sm"
                >
                  {{ m.age || 'P' }}
                </span>
              </a>

              <div class="ml-8 pt-2.5">
                <a
                  [routerLink]="['/movie', m.id]"
                  class="block truncate text-sm font-bold text-white transition hover:text-[#e50914] group-hover:text-amber-300"
                >
                  {{ m.title }}
                </a>
                <p class="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                  {{ m.genre.split(',')[0] }} · {{ m.country || 'Quốc tế' }}
                </p>

                <div class="mt-2.5 flex items-center gap-1.5">
                  <a
                    [routerLink]="['/showtimes']"
                    [queryParams]="showtimesQueryParams(m)"
                    class="inline-flex flex-1 items-center justify-center rounded-[4px] bg-[#e50914] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(229,9,20,0.4)] transition hover:bg-[#ff1f2d]"
                  >
                    Mua vé
                  </a>
                  <a
                    [routerLink]="['/movie', m.id]"
                    class="inline-flex items-center justify-center rounded-[4px] bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition"
                  >
                    Chi tiết
                  </a>
                </div>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- 4. Section CineHub AI Dành riêng cho bạn (Atmospheric Cinematic Studio) -->
      <section
        class="relative mt-14 overflow-hidden border-y border-white/[0.08] bg-gradient-to-b from-[#0a0f1d] via-[#05070d] to-[#020617] py-16"
      >
        <!-- Ambient Radial Glows -->
        <div
          class="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-red-600/10 blur-[130px]"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[130px]"
          aria-hidden="true"
        ></div>

        <div
          class="relative z-10 mx-auto grid max-w-[1400px] gap-8 px-5 md:grid-cols-[.8fr_2fr] md:items-center md:px-9"
        >
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-[3px] bg-red-600/15 border border-red-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-red-400"
            >
              ✨ CINEHUB AI ENGINE
            </span>
            <h2 class="mt-2 text-2xl font-black uppercase tracking-wide text-white md:text-3xl">
              Dành riêng cho bạn
            </h2>
            <p class="mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-300">
              {{
                authStore.isAuthenticated()
                  ? 'Gợi ý chuẩn gu theo sở thích và lịch sử xem phim của ' +
                    authStore.displayName() +
                    '.'
                  : 'Khám phá những bộ phim đang được yêu thích nhất hiện tại.'
              }}
            </p>
            @if (!authStore.isAuthenticated()) {
              <a
                routerLink="/auth"
                class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-400 transition hover:text-amber-300"
              >
                Đăng nhập để nhận gợi ý chuẩn gu →
              </a>
            }
          </div>

          <div class="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            @for (m of recommendedMovies(); track m.id) {
              <div
                class="group relative flex min-w-0 gap-3.5 rounded-[4px] border border-white/[0.08] bg-[#0c1322]/85 p-3.5 shadow-xl transition-all duration-300 hover:border-[#e50914]/50 hover:bg-[#11192e] hover:shadow-[0_12px_35px_rgba(0,0,0,0.9)] hover:-translate-y-0.5"
              >
                <!-- Top Glow Hover Line -->
                <div
                  class="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#e50914] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                ></div>

                <a
                  [routerLink]="['/movie', m.id]"
                  class="shrink-0 overflow-hidden rounded-[3px] border border-white/10 shadow-lg"
                >
                  <img
                    [src]="m.poster"
                    [alt]="'Poster ' + m.title"
                    class="h-28 w-[76px] object-cover shadow transition duration-300 group-hover:scale-105"
                  />
                </a>
                <div class="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                  <div>
                    <a
                      [routerLink]="['/movie', m.id]"
                      class="line-clamp-2 block text-sm font-bold text-white transition hover:text-[#e50914] group-hover:text-amber-300"
                    >
                      {{ m.title }}
                    </a>
                    <p class="mt-1 line-clamp-1 text-xs font-semibold text-amber-300">
                      {{ m.genre.split(',')[0] }} · Đang thịnh hành
                    </p>
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold text-slate-400">
                      {{ m.age || 'Phim rạp' }}
                    </span>
                    <a
                      [routerLink]="['/showtimes']"
                      [queryParams]="showtimesQueryParams(m)"
                      class="rounded-[4px] bg-[#e50914] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_2px_10px_rgba(229,9,20,0.4)] transition hover:bg-[#ff1f2d]"
                    >
                      Mua vé
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 5. Section Thư Viện Của Bạn -->
      <section
        class="mx-auto grid max-w-[1400px] gap-6 px-5 py-14 md:px-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[auto_auto]"
      >
        <aside
          class="h-fit rounded-[4px] border border-white/[0.08] bg-[#0c1322]/90 p-3.5 shadow-2xl backdrop-blur-xl lg:col-start-1 lg:row-start-2"
        >
          <p class="px-3 pb-3 pt-2 text-[11px] font-black uppercase tracking-widest text-[#e50914]">
            THƯ VIỆN CỦA BẠN
          </p>
          <div class="flex flex-col gap-1.5">
            @for (item of shelfOptions; track item.key) {
              <button
                type="button"
                (click)="shelf.set(item.key)"
                class="flex w-full items-center gap-3 rounded-[3px] px-3.5 py-2.5 text-left text-sm transition"
                [class]="
                  shelf() === item.key
                    ? 'bg-gradient-to-r from-[#e50914]/20 to-transparent border-l-2 border-[#e50914] font-bold text-white shadow-sm'
                    : 'bg-transparent text-slate-300 font-semibold hover:bg-white/5 hover:text-white'
                "
              >
                <span>{{ item.label }}</span>
              </button>
            }
          </div>
        </aside>

        <div class="min-w-0 lg:contents">
          <div class="mb-5 flex items-end justify-between gap-4 lg:col-start-2 lg:row-start-1">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-amber-400">
                CineHub của bạn
              </p>
              <h2 class="mt-1 text-2xl font-black text-white">
                {{
                  shelf() === 'history'
                    ? 'Xem tiếp'
                    : shelf() === 'collection'
                      ? 'Bộ sưu tập của tôi'
                      : 'Đang thịnh hành'
                }}
              </h2>
            </div>
            <span class="text-xs font-semibold text-slate-400"
              >{{ shelfMovies().length }} phim</span
            >
          </div>

          <div
            class="scrollbar-hide -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-3 lg:col-start-2 lg:row-start-2"
          >
            @for (m of shelfMovies(); track m.id) {
              <article
                class="group flex w-[160px] shrink-0 snap-start flex-col transition duration-300 sm:w-[178px]"
              >
                <a
                  [routerLink]="['/movie', m.id]"
                  class="relative block aspect-[2/3] overflow-hidden rounded-[4px] bg-[#0c1322] border border-white/[0.08] shadow-md transition duration-500 group-hover:scale-105 group-hover:border-[#e50914]/60 group-hover:shadow-[0_12px_30px_rgba(229,9,20,0.3)]"
                >
                  <img
                    [src]="m.poster"
                    [alt]="'Poster ' + m.title"
                    class="h-full w-full object-cover"
                  />
                  <span
                    class="absolute right-2 top-2 rounded-[2px] bg-black/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/30 backdrop-blur-sm"
                  >
                    ★ {{ m.rating || 'Mới' }}
                  </span>
                </a>
                <a
                  [routerLink]="['/movie', m.id]"
                  class="mt-2 block truncate text-xs font-bold text-white transition hover:text-amber-300 group-hover:text-amber-300"
                >
                  {{ m.title }}
                </a>
                <div
                  class="mt-0.5 flex items-center justify-between text-[11px] font-medium text-slate-400"
                >
                  <span class="truncate">{{ m.genre.split(',')[0] }}</span>
                  <span class="shrink-0 text-slate-500">{{ m.country || 'Việt Nam' }}</span>
                </div>
                <div class="mt-2 flex items-center gap-1.5">
                  <a
                    [routerLink]="['/showtimes']"
                    [queryParams]="showtimesQueryParams(m)"
                    class="inline-flex flex-1 items-center justify-center rounded-[4px] bg-[#e50914] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(229,9,20,0.4)] transition hover:bg-[#ff1f2d]"
                  >
                    Mua vé
                  </a>
                  <a
                    [routerLink]="['/movie', m.id]"
                    class="inline-flex items-center justify-center rounded-[4px] bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition"
                  >
                    Xem
                  </a>
                </div>
              </article>
            }
          </div>
        </div>
      </section>

      <!-- 6. Section PHIM (Đang chiếu / Sắp chiếu & Country Pills) -->
      <section class="mx-auto max-w-[1400px] px-5 py-16 md:px-9">
        @if (store.error()) {
          <div
            role="alert"
            class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          >
            <span>{{ store.error() }} Đang hiển thị dữ liệu đã có.</span>
            <button type="button" (click)="refreshCatalog()" class="font-bold text-amber-300">
              Thử cập nhật lại
            </button>
          </div>
        } @else if (store.loading()) {
          <p role="status" class="mb-5 text-sm font-semibold text-slate-400">
            Đang cập nhật danh sách phim mới nhất…
          </p>
        }
        @if (showtimesStore.error()) {
          <div
            role="alert"
            class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          >
            <span>{{ showtimesStore.error() }}</span>
            <button type="button" (click)="refreshShowtimes()" class="font-bold text-amber-300">
              Thử tải lịch lại
            </button>
          </div>
        }
        <div class="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            class="h-6 w-1 rounded-[1px] bg-[#e50914] shadow-[0_0_12px_#e50914]"
          ></span>
          <h2 class="text-2xl font-black uppercase tracking-wide text-white">PHIM CHIẾU RẠP</h2>
        </div>

        <!-- Status Tabs: Đang chiếu / Sắp chiếu (Hellbound / Tubelix Cinema Tabs) -->
        <div role="tablist" class="mb-8 flex gap-8 border-b border-white/[0.08]">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'now'"
            (click)="activeTab.set('now')"
            class="-mb-px border-b-2 pb-3.5 text-base uppercase tracking-wider transition"
            [class]="
              activeTab() === 'now'
                ? 'border-[#e50914] font-black text-white drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]'
                : 'border-transparent font-bold text-slate-400 hover:text-white'
            "
          >
            Đang chiếu
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'soon'"
            (click)="activeTab.set('soon')"
            class="-mb-px border-b-2 pb-3.5 text-base uppercase tracking-wider transition"
            [class]="
              activeTab() === 'soon'
                ? 'border-[#e50914] font-black text-white drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]'
                : 'border-transparent font-bold text-slate-400 hover:text-white'
            "
          >
            Sắp chiếu
          </button>
        </div>

        <!-- Thể loại Phim Filter Pills (Sleek Clean Tabs - Auth Style) -->
        <div
          class="scrollbar-hide mb-8 flex gap-2 overflow-x-auto pb-2"
          aria-label="Lọc theo thể loại phim"
        >
          @for (f of filterOptions(); track f.key) {
            <button
              type="button"
              (click)="catalogFilter.set(f.key)"
              class="shrink-0 rounded-[4px] px-4 py-2 text-xs font-bold uppercase tracking-wider transition"
              [class]="
                catalogFilter() === f.key
                  ? 'bg-[#e50914] text-white shadow-[0_4px_16px_rgba(229,9,20,0.5)]'
                  : 'bg-[#0f172a]/90 text-slate-300 hover:bg-[#1e293b] hover:text-white border border-white/[0.08]'
              "
            >
              {{ f.label }}
            </button>
          }
        </div>

        <!-- Movie Cards Grid -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          @for (m of displayMovies(); track m.id) {
            <ch-movie-card [movie]="m" />
          } @empty {
            <div
              class="col-span-full rounded-[4px] border border-white/10 bg-[#0c1322]/60 p-12 text-center text-sm font-medium text-slate-400"
            >
              Không tìm thấy bộ phim phù hợp với bộ lọc hiện tại.
            </div>
          }
        </div>
      </section>

      <!-- 7. Member Promo Callout Banner -->
      <section class="mx-auto max-w-[1400px] px-5 pb-16 md:px-9">
        <div
          class="relative overflow-hidden flex flex-col gap-5 rounded-[6px] border border-white/[0.12] bg-gradient-to-r from-[#141b2c] via-[#0d1322] to-[#260b0e] p-7 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-9"
        >
          <div
            class="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-red-600/10 to-transparent"
            aria-hidden="true"
          ></div>
          <div class="relative z-10">
            <span
              class="inline-flex rounded-[2px] bg-[#e50914]/20 border border-[#e50914]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-400"
            >
              ƯU ĐÃI ĐẶC QUYỀN THÀNH VIÊN
            </span>
            <h2 class="mt-2 text-2xl font-black text-white md:text-3xl">
              Một Vé Hay, Thêm Vạn Niềm Vui
            </h2>
            <p class="mt-2 text-sm font-semibold text-slate-200">
              Nhập mã <b class="font-black text-amber-300">CINEHUB20</b> để nhận ưu đãi 20.000₫ cho
              vé tiếp theo.
            </p>
          </div>
          <a
            [routerLink]="buildShowtimesLink()"
            class="relative z-10 inline-flex items-center justify-center gap-2 rounded-[4px] bg-gradient-to-r from-[#e50914] to-[#f6121d] hover:from-[#f6121d] hover:to-[#ff2a36] px-8 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(229,9,20,0.5)] transition active:scale-[0.99]"
          >
            Khám phá suất chiếu →
          </a>
        </div>
      </section>
    </main>
  `,
})
export class HomePageComponent implements OnInit, OnDestroy {
  readonly store = inject(CatalogStore);
  readonly showtimesStore = inject(ShowtimesStore);
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly banners = [
    {
      id: 'trai-buon-nguoi',
      title: 'Ưu đãi Trại Buôn Người',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792729025/IMG_1348.png',
    },
    {
      id: 'shopeepay',
      title: 'Ưu đãi ShopeePay',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792728689/IMG_1333.png',
    },
    {
      id: 'momo',
      title: 'Ưu đãi MoMo',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792755846/IMG_1365.png',
    },
    {
      id: 'joydrops',
      title: 'Ưu đãi JoyDrops',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792728622/IMG_1332.png',
    },
    {
      id: 'shaune',
      title: 'Ưu đãi shaun',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792731423/IMG_1360.png',
    },
    {
      id: 'godzila',
      title: 'Ưu đãi Godzila',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792755871/IMG_1366.png',
    },
    {
      id: 'dune',
      title: 'Ưu đãi Dune',
      image: 'https://res.cloudinary.com/cljwquf9/image/upload/v1792755977/IMG_1367.png',
    },
  ];
  readonly currentSlide = signal(0);
  private carouselTimer: ReturnType<typeof setInterval> | null = null;
  private isCarouselPaused = false;

  // QuickBooking Bar State
  readonly cinemaList = computed(() => {
    const cinemas = new Map<string, { id: string; name: string }>();
    const movieId = this.quickMovieId();
    const sessions = movieId
      ? filterShowtimes([...this.showtimesStore.sessions()], { movieId })
      : [...this.showtimesStore.sessions()];
    for (const session of sessions) {
      const id = session.cinema.code || session.cinema.id;
      if (id && !cinemas.has(id)) {
        cinemas.set(id, { id, name: session.cinema.name });
      }
    }
    return [...cinemas.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  });
  readonly quickMovieId = signal<string>('');
  readonly quickCinemaId = signal<string>('');
  readonly quickShowtimeDate = signal<string>('');

  // Tabs & Filters
  readonly activeTab = signal<'now' | 'soon'>('now');
  readonly catalogFilter = signal<string>('all');
  readonly shelf = signal<'history' | 'collection' | 'trending'>('history');

  readonly filterOptions = computed(() => [
    { key: 'all', label: 'Tất cả' },
    ...this.store.availableGenres().map((genre) => ({ key: genre, label: genre })),
  ]);

  readonly shelfOptions = [
    { key: 'history' as const, label: 'Lịch sử / Xem tiếp' },
    { key: 'collection' as const, label: 'Bộ sưu tập' },
    { key: 'trending' as const, label: 'Đang thịnh hành' },
  ];

  readonly nowShowingMovies = computed(() =>
    this.store
      .movies()
      .filter((movie) => this.isMovieCurrentlyShowing(movie))
      .map((movie) => this.withStatus(movie, 'now')),
  );
  readonly quickMovies = computed(() =>
    this.nowShowingMovies().filter(
      (movie) =>
        filterShowtimes([...this.showtimesStore.sessions()], { movieId: movie.slug || movie.id })
          .length > 0,
    ),
  );
  readonly quickDateOptions = computed(() => {
    const movieId = this.quickMovieId();
    if (!movieId) return [];

    const sessions = filterShowtimes([...this.showtimesStore.sessions()], {
      movieId,
      cinemaId: this.quickCinemaId() || 'all',
    });
    const counts = new Map<string, number>();
    for (const session of sessions) {
      const date = session.showDate.slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const dateValue = new Date(`${date}T12:00:00+07:00`);
        const weekday =
          date === vietnamDate()
            ? 'Hôm nay'
            : new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                weekday: 'short',
              })
                .format(dateValue)
                .replace(/\.$/, '');
        return {
          date,
          count,
          label: `${weekday} · ${date.slice(8, 10)}/${date.slice(5, 7)} · ${count} suất`,
        };
      });
  });
  readonly comingSoonMovies = computed(() =>
    this.store
      .movies()
      .filter((movie) => this.isMovieComingSoon(movie))
      .map((movie) => this.withStatus(movie, 'soon')),
  );

  readonly trendingMovies = computed(() =>
    [...this.store.movies()]
      .filter((movie) => this.isMovieCurrentlyShowing(movie))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10),
  );

  readonly recommendedMovies = computed(() => this.trendingMovies().slice(0, 3));

  readonly shelfMovies = computed(() => {
    const bookable = this.nowShowingMovies();
    const list = bookable.length > 0 ? bookable : [...this.comingSoonMovies()];
    if (this.shelf() === 'trending') {
      return this.trendingMovies().slice(0, 6);
    }
    if (this.shelf() === 'collection') {
      const notified = this.store.movies().filter((movie) => this.store.isMovieNotified(movie.id));
      return (notified.length > 0 ? notified : list).slice(0, 6);
    }
    return list.slice(0, 6);
  });

  constructor() {
    effect(() => {
      this.quickMovies();
      this.showtimesStore.sessions();
      this.syncQuickBookingDefaults();
    });
  }

  showtimesQueryParams(movie: Movie): Record<string, string> {
    return buildShowtimesQueryParams(movie);
  }

  readonly displayMovies = computed(() => {
    const tab = this.activeTab();
    const filter = this.catalogFilter().toLowerCase().trim();
    const movies = tab === 'now' ? this.nowShowingMovies() : this.comingSoonMovies();
    return movies.filter((m) => {
      if (filter === 'all' || !filter) return true;
      const genre = (m.genre || '').toLowerCase();
      return genre.includes(filter);
    });
  });

  ngOnInit(): void {
    void Promise.all([this.store.refreshFromApi(), this.showtimesStore.loadSessionsFromApi()]).then(
      () => {
        this.syncQuickBookingDefaults();
      },
    );
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  startCarousel(): void {
    this.stopCarousel();
    this.carouselTimer = setInterval(() => {
      if (!this.isCarouselPaused && this.banners.length > 0) {
        this.currentSlide.update((i) => (i + 1) % this.banners.length);
      }
    }, 6000);
  }

  stopCarousel(): void {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }

  pauseCarousel(): void {
    this.isCarouselPaused = true;
  }

  resumeCarousel(): void {
    this.isCarouselPaused = false;
  }

  stepSlide(direction: number): void {
    const len = this.banners.length;
    if (len === 0) return;
    this.currentSlide.update((i) => (i + direction + len) % len);
  }

  onQuickMovieChange(event: Event): void {
    this.quickMovieId.set((event.target as HTMLSelectElement).value);
    this.quickCinemaId.set('');
    this.selectFirstQuickDate();
  }

  onQuickCinemaChange(event: Event): void {
    this.quickCinemaId.set((event.target as HTMLSelectElement).value);
    this.selectFirstQuickDate();
  }

  onQuickDayChange(event: Event): void {
    this.quickShowtimeDate.set((event.target as HTMLSelectElement).value);
  }

  submitQuickBooking(): void {
    const movie = this.quickMovies().find(
      (candidate) =>
        candidate.slug === this.quickMovieId() || String(candidate.id) === this.quickMovieId(),
    );
    const date = this.quickShowtimeDate();
    if (
      !movie ||
      !date ||
      this.showtimesStore.loading() ||
      !this.quickDateOptions().some((option) => option.date === date)
    ) {
      return;
    }
    const cId = this.quickCinemaId();
    void this.router.navigateByUrl(buildShowtimesLink(movie, { cinemaId: cId || undefined, date }));
  }

  refreshCatalog(): void {
    void this.store.refreshFromApi();
  }

  refreshShowtimes(): void {
    void this.showtimesStore.loadSessionsFromApi();
  }

  buildShowtimesLink(): string {
    return buildShowtimesLink();
  }

  private syncQuickBookingDefaults(): void {
    const availableMovies = this.quickMovies();
    const selectedMovieExists = availableMovies.some(
      (movie) => movie.slug === this.quickMovieId() || String(movie.id) === this.quickMovieId(),
    );
    if (!selectedMovieExists) {
      const firstMovie = availableMovies[0];
      this.quickMovieId.set(firstMovie ? firstMovie.slug || String(firstMovie.id) : '');
    }
    if (!this.cinemaList().some((cinema) => cinema.id === this.quickCinemaId())) {
      this.quickCinemaId.set('');
    }
    this.selectFirstQuickDate();
  }

  private selectFirstQuickDate(): void {
    const currentDate = this.quickShowtimeDate();
    if (this.quickDateOptions().some((option) => option.date === currentDate)) return;
    this.quickShowtimeDate.set(this.quickDateOptions()[0]?.date ?? '');
  }

  private isMovieCurrentlyShowing(movie: Movie): boolean {
    if (movie.status === 'now') return true;
    if (
      this.showtimesStore.loading() ||
      !this.showtimesStore.fetchedAt() ||
      this.showtimesStore.error()
    ) {
      return false;
    }

    return this.showtimesStore
      .sessions()
      .some(
        (session) =>
          String(session.movie.id) === String(movie.id) ||
          (!!movie.dbId && session.movie.dbId === movie.dbId) ||
          (!!movie.slug && session.movie.slug === movie.slug),
      );
  }

  private withStatus(movie: Movie, status: Movie['status']): Movie {
    return movie.status === status ? movie : { ...movie, status };
  }

  private isMovieComingSoon(movie: Movie): boolean {
    if (this.showtimesStore.loading() || !this.showtimesStore.fetchedAt()) {
      return movie.status === 'soon';
    }
    if (this.isMovieCurrentlyShowing(movie)) return false;
    return movie.status === 'soon';
  }
}
