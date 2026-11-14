import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
      <!-- 1. Top Phim Thịnh Hành (Cinematic Hero Showcase & Top 10 Thumbnail Strip with Outline Numbers) -->
      @if (trendingMovies().length > 0) {
        <section
          class="relative w-full overflow-hidden bg-[#020617] text-white"
          (mouseenter)="pauseTrending()"
          (mouseleave)="resumeTrending()"
          aria-label="Top phim thịnh hành"
        >
          <!-- Background Horizontal Posters with Smooth Cross-Fade Transition (Độ rộng mở rộng, tỷ lệ poster ngang fit đẹp) -->
          <div
            class="relative w-full min-h-[460px] sm:min-h-[520px] md:min-h-[580px] lg:min-h-[620px] overflow-hidden"
          >
            @for (movie of trendingMovies(); track movie.id; let idx = $index) {
              <div
                class="absolute inset-0 transition-all duration-700 ease-out"
                [class]="
                  selectedTrendingIndex() === idx
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-105 pointer-events-none z-0'
                "
              >
                <img
                  [src]="movie.backdrop || movie.poster"
                  [alt]="movie.title"
                  class="h-full w-full object-cover object-right md:object-center"
                />
              </div>
            }

            <!-- Soft Contrast Scrim: Che mờ nền chữ bên trái, giữ sáng 100% hình ảnh poster/nhân vật ở giữa và bên phải -->
            <div
              class="pointer-events-none absolute inset-y-0 left-0 z-10 w-full sm:w-2/3 md:w-[55%] lg:w-[48%] bg-gradient-to-r from-[#020617] via-[#020617]/85 to-transparent"
            ></div>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"
            ></div>
            <div
              class="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[#020617]/70 to-transparent"
            ></div>

            <!-- Hero Content Container (Overlaying the Backdrop) -->
            <div
              class="relative z-20 mx-auto flex h-full min-h-[460px] sm:min-h-[520px] md:min-h-[580px] lg:min-h-[620px] max-w-[1440px] flex-col justify-center px-5 pt-10 pb-12 md:px-9 md:pt-14 md:pb-16"
            >
              <div class="max-w-2xl">
                <!-- Badge Xu hướng -->
                <div
                  class="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 backdrop-blur-md"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                    TOP #{{ selectedTrendingIndex() + 1 }} THỊNH HÀNH
                  </span>
                </div>

                <!-- Big Bold Movie Title -->
                <h1
                  class="mt-3.5 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] leading-tight"
                >
                  {{ currentTrendingMovie()?.title }}
                </h1>

                <!-- Metadata Row (Rating, Year, Duration, Age, Genre) -->
                <div
                  class="mt-3 flex flex-wrap items-center gap-2 text-xs md:text-sm font-bold text-white/90"
                >
                  <span
                    class="flex items-center gap-1 rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-black shadow-md shadow-amber-400/30"
                  >
                    ★ {{ currentTrendingMovie()?.rating || '9.6' }}
                  </span>
                  <span class="text-slate-300">
                    {{ formatReleaseDate(currentTrendingMovie()?.release) }}
                  </span>
                  <span class="text-white/30">•</span>
                  <span class="text-slate-300">
                    {{ currentTrendingMovie()?.duration || '2h 2m' }}
                  </span>
                  <span class="text-white/30">•</span>
                  <span
                    class="rounded border border-amber-400/60 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-black text-amber-300"
                  >
                    {{ currentTrendingMovie()?.age || 'P' }}
                  </span>
                  <span class="text-white/30">•</span>
                  <span class="font-medium text-amber-300">
                    {{ currentTrendingMovie()?.genre }}
                  </span>
                </div>

                <!-- Description / Giới thiệu phim trên banner (Đầy đủ nội dung, súc tích trọn vẹn) -->
                @if (currentTrendingMovie()?.synopsis || currentTrendingMovie()?.description) {
                  <p
                    class="mt-3.5 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-slate-200 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-3 md:line-clamp-4"
                  >
                    {{ currentTrendingMovie()?.synopsis || currentTrendingMovie()?.description }}
                  </p>
                }

                <!-- Action Buttons (Mua vé ngay, Chi tiết phim, Trailer) -->
                <div class="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    [routerLink]="['/showtimes']"
                    [queryParams]="
                      currentTrendingMovie() ? showtimesQueryParams(currentTrendingMovie()!) : {}
                    "
                    class="inline-flex items-center gap-2 rounded-[6px] bg-gradient-to-r from-[#e50914] to-[#f43f5e] hover:from-[#f43f5e] hover:to-[#fb7185] px-6 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_4px_20px_rgba(229,9,20,0.5)] transition active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path
                        d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a3 3 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-4z"
                      />
                    </svg>
                    Mua vé ngay
                  </a>

                  <a
                    [routerLink]="[
                      '/movie',
                      currentTrendingMovie()?.slug || currentTrendingMovie()?.id,
                    ]"
                    class="inline-flex items-center justify-center rounded-[6px] border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-2.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition"
                  >
                    Chi tiết phim
                  </a>

                  @if (currentTrendingMovie()?.trailer) {
                    <button
                      type="button"
                      (click)="openTrailer(currentTrendingMovie()?.trailer)"
                      class="inline-flex items-center gap-1.5 rounded-[6px] border border-white/15 bg-black/40 hover:bg-black/60 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-200 backdrop-blur-md transition"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Trailer
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Section TOP 10 THỊNH HÀNH với Dãy Phim và Số Viền (Đúng như Hình 1) -->
          <div class="relative z-20 mx-auto -mt-6 sm:-mt-8 max-w-[1440px] px-5 pb-8 md:px-9">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                <span class="text-amber-400">TOP 10</span> THỊNH HÀNH
              </h2>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="stepTrending(-1)"
                  aria-label="Phim trước"
                  class="grid h-8 w-8 place-items-center rounded-[4px] border border-white/15 bg-black/60 text-white backdrop-blur transition hover:bg-amber-400 hover:text-black hover:border-transparent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  (click)="stepTrending(1)"
                  aria-label="Phim sau"
                  class="grid h-8 w-8 place-items-center rounded-[4px] border border-white/15 bg-black/60 text-white backdrop-blur transition hover:bg-amber-400 hover:text-black hover:border-transparent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Row Cards with Stylized Numbers (Hollow Outline for unselected, Solid Yellow for active) -->
            <div
              #trendingRow
              class="scrollbar-hide flex items-end gap-5 overflow-x-auto pb-4 pt-2 scroll-smooth"
            >
              @for (movie of trendingMovies(); track movie.id; let idx = $index) {
                <button
                  type="button"
                  [attr.data-index]="idx"
                  (click)="selectTrending(idx)"
                  [attr.aria-label]="'Chọn phim ' + movie.title"
                  class="group relative flex shrink-0 items-end cursor-pointer text-left transition-transform duration-300 hover:scale-[1.03] focus:outline-none"
                >
                  <!-- Stylized Giant Number (Italic, outlined or filled gold) -->
                  <span
                    class="select-none font-black italic tracking-tighter leading-none transition-all duration-300 pr-1.5 shrink-0"
                    [style]="
                      selectedTrendingIndex() === idx
                        ? 'color: #fbbf24; text-shadow: 0 0 25px rgba(251,191,36,0.6); -webkit-text-stroke: 0;'
                        : 'color: transparent; -webkit-text-stroke: 2px rgba(255,255,255,0.45);'
                    "
                    style="font-size: clamp(56px, 7vw, 92px);"
                  >
                    {{ idx + 1 }}
                  </span>

                  <!-- Poster Card -->
                  <div
                    class="relative aspect-[2/3] w-[135px] sm:w-[165px] md:w-[190px] lg:w-[210px] overflow-hidden rounded-[6px] bg-[#0c1322] transition-all duration-300"
                    [class]="
                      selectedTrendingIndex() === idx
                        ? 'border-2 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_25px_rgba(251,191,36,0.45)]'
                        : 'border border-white/10 group-hover:border-white/40'
                    "
                  >
                    <img
                      [src]="movie.poster"
                      [alt]="movie.title"
                      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent"
                    ></div>

                    <!-- Info inside poster (Image 1 style) -->
                    <div class="absolute bottom-2.5 left-2.5 right-2.5">
                      <p class="truncate text-xs sm:text-sm font-bold text-white drop-shadow">
                        {{ movie.title }}
                      </p>
                      <p
                        class="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-300 drop-shadow"
                      >
                        <span>★</span>
                        <span>{{ movie.rating }}</span>
                      </p>
                    </div>
                  </div>
                </button>
              }
            </div>
          </div>
        </section>
      }

      <!-- 2. Section ƯU ĐÃI ĐẶC QUYỀN - KHUYẾN MÃI & SỰ KIỆN NỔI BẬT (Đưa lên ngay dưới phần Top Thịnh Hành theo yêu cầu 2) -->
      @if (banners.length > 0) {
        <section
          class="relative mx-auto mt-6 md:mt-10 max-w-[1440px] px-5 md:px-9"
          (mouseenter)="pauseCarousel()"
          (mouseleave)="resumeCarousel()"
          aria-roledescription="carousel"
          aria-label="Chương trình ưu đãi và sự kiện"
        >
          <div class="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div class="flex items-center gap-3">
              <span class="h-6 w-1 rounded-[1px] bg-amber-400 shadow-[0_0_12px_#fbbf24]"></span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400">
                  ƯU ĐÃI ĐẶC QUYỀN
                </p>
                <h2
                  class="mt-0.5 text-xl font-black uppercase tracking-wide text-white md:text-2xl"
                >
                  KHUYẾN MÃI & SỰ KIỆN NỔI BẬT
                </h2>
              </div>
            </div>

            <!-- Slide Dots & Controls (Image 2 style) -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="stepSlide(-1)"
                aria-label="Ưu đãi trước"
                class="grid h-8 w-8 place-items-center rounded-[4px] border border-white/10 bg-black/60 text-white shadow backdrop-blur transition hover:bg-[#e50914] hover:border-transparent"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div class="hidden sm:flex items-center gap-1.5">
                @for (slide of banners; track slide.id; let idx = $index) {
                  <button
                    type="button"
                    (click)="currentSlide.set(idx)"
                    [attr.aria-label]="'Banner ' + (idx + 1)"
                    class="h-1 rounded-[1px] transition-all duration-300"
                    [class]="
                      currentSlide() === idx
                        ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'w-2.5 bg-white/30 hover:bg-white/60'
                    "
                  ></button>
                }
              </div>

              <button
                type="button"
                (click)="stepSlide(1)"
                aria-label="Ưu đãi sau"
                class="grid h-8 w-8 place-items-center rounded-[4px] border border-white/10 bg-black/60 text-white shadow backdrop-blur transition hover:bg-[#e50914] hover:border-transparent"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Carousel Banner Container (Image 2 style) -->
          <div
            class="relative h-[200px] sm:h-[280px] md:h-[350px] lg:h-[390px] w-full overflow-hidden rounded-[8px] border border-white/10 shadow-2xl"
          >
            @for (slide of banners; track slide.id; let idx = $index) {
              <div
                class="absolute inset-0 transition-opacity duration-700"
                [class]="
                  currentSlide() === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                "
              >
                <img
                  [src]="slide.image || slide.imageUrl"
                  [alt]="slide.title"
                  class="h-full w-full object-cover object-center"
                />
                <div
                  class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/30"
                ></div>
                <div class="absolute bottom-6 left-6 z-20 max-w-lg">
                  <span
                    class="rounded bg-[#e50914] px-2.5 py-1 text-[10px] font-black uppercase text-white shadow"
                  >
                    HOT PROMO
                  </span>
                  <h3 class="mt-2 text-xl sm:text-2xl font-black text-white drop-shadow-lg">
                    {{ slide.title }}
                  </h3>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- 3. Thanh QuickBooking Mua vé nhanh (Luxury Cinema Console) -->
      <div class="relative z-20 mx-auto mt-10 md:mt-14 max-w-[1440px] px-5 md:px-9">
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

      <!-- 4. Section CineHub AI Dành riêng cho bạn (Atmospheric Cinematic Studio) -->
      <section
        class="relative mt-14 overflow-hidden border-y border-white/[0.08] bg-gradient-to-b from-[#0a0f1d] via-[#05070d] to-[#020617] py-14"
      >
        <div
          class="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-red-600/10 blur-[130px]"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[130px]"
          aria-hidden="true"
        ></div>

        <div class="relative z-10 mx-auto max-w-[1440px] px-5 md:px-9">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="h-7 w-1 rounded-[1px] bg-amber-400 shadow-[0_0_12px_#fbbf24]"></span>
              <div>
                <p class="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400">
                  CineHub AI STUDIO
                </p>
                <h2
                  class="mt-0.5 text-2xl font-black uppercase tracking-wide text-white md:text-3xl"
                >
                  Gợi Ý Riêng Cho Bạn
                </h2>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (tab of shelfOptions; track tab.key) {
                <button
                  type="button"
                  (click)="shelf.set(tab.key)"
                  class="rounded-[4px] px-3.5 py-1.5 text-xs font-bold transition duration-200"
                  [class]="
                    shelf() === tab.key
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'border border-white/10 bg-black/40 text-slate-300 hover:border-white/20 hover:text-white'
                  "
                >
                  {{ tab.label }}
                </button>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-6">
            @for (m of shelfMovies(); track m.id) {
              <ch-movie-card [movie]="m" />
            }
          </div>
        </div>
      </section>

      <!-- 5. Section Phim Đang Chiếu & Lọc Thể Loại -->
      <section
        id="phim-dang-chieu"
        class="relative mx-auto max-w-[1440px] px-5 pt-14 md:px-9 md:pt-16"
      >
        <div
          class="mb-8 flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="h-7 w-1 rounded-[1px] bg-[#e50914] shadow-[0_0_12px_#e50914]"></span>
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.25em] text-[#e50914]">
                DANH MỤC PHIM
              </p>
              <h2 class="mt-0.5 text-2xl font-black uppercase tracking-wide text-white md:text-3xl">
                Phim Đang Chiếu
              </h2>
            </div>
          </div>

          <!-- Tabs Now / Soon -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="activeTab.set('now')"
              class="rounded-[4px] px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition duration-200"
              [class]="
                activeTab() === 'now'
                  ? 'bg-[#e50914] text-white shadow-lg shadow-red-600/30'
                  : 'border border-white/10 bg-black/40 text-slate-300 hover:border-white/20 hover:text-white'
              "
            >
              Đang Chiếu ({{ nowShowingMovies().length }})
            </button>
            <button
              type="button"
              (click)="activeTab.set('soon')"
              class="rounded-[4px] px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition duration-200"
              [class]="
                activeTab() === 'soon'
                  ? 'bg-[#e50914] text-white shadow-lg shadow-red-600/30'
                  : 'border border-white/10 bg-black/40 text-slate-300 hover:border-white/20 hover:text-white'
              "
            >
              Sắp Chiếu ({{ comingSoonMovies().length }})
            </button>
          </div>
        </div>

        <!-- Filter Genres -->
        <div class="scrollbar-hide mb-8 flex items-center gap-2 overflow-x-auto pb-2">
          @for (filter of filterOptions(); track filter.key) {
            <button
              type="button"
              (click)="catalogFilter.set(filter.key)"
              class="shrink-0 rounded-[4px] px-3.5 py-1.5 text-xs font-bold transition duration-200"
              [class]="
                catalogFilter() === filter.key
                  ? 'bg-white text-black shadow-md'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white'
              "
            >
              {{ filter.label }}
            </button>
          }
        </div>

        <!-- Movies Grid -->
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
          @for (m of displayMovies(); track m.id) {
            <ch-movie-card [movie]="m" />
          }
        </div>
      </section>

      <!-- 6. Section Trải Nghiệm Công Nghệ Rạp -->
      <section class="mx-auto max-w-[1440px] px-5 py-16 md:px-9">
        <div class="mb-10 text-center">
          <p class="text-[11px] font-black uppercase tracking-[0.25em] text-[#e50914]">
            ĐẲNG CẤP ĐIỆN ẢNH
          </p>
          <h2 class="mt-1 text-2xl font-black uppercase tracking-wide text-white md:text-4xl">
            Công Nghệ Chiếu Đỉnh Cao
          </h2>
          <p class="mx-auto mt-2 max-w-xl text-xs md:text-sm text-slate-400">
            Hòa mình vào không gian điện ảnh chân thực chuẩn quốc tế tại mọi cụm rạp CineHub
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            class="group relative overflow-hidden rounded-[6px] border border-white/10 bg-gradient-to-b from-[#101726] to-[#04060c] p-6 shadow-xl transition-all duration-300 hover:border-amber-400/50 hover:shadow-[0_12px_30px_rgba(251,191,36,0.15)]"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-[4px] bg-amber-400/20 text-amber-400"
            >
              <span class="text-xl font-black">IMAX</span>
            </div>
            <h3 class="mt-4 text-base font-extrabold text-white">IMAX Laser 4K</h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              Màn hình cong cực đại cùng hệ thống máy chiếu đôi tái hiện độ tương phản hoàn hảo.
            </p>
          </div>

          <div
            class="group relative overflow-hidden rounded-[6px] border border-white/10 bg-gradient-to-b from-[#101726] to-[#04060c] p-6 shadow-xl transition-all duration-300 hover:border-[#e50914]/50 hover:shadow-[0_12px_30px_rgba(229,9,20,0.15)]"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-[4px] bg-[#e50914]/20 text-[#e50914]"
            >
              <span class="text-xl font-black">4DX</span>
            </div>
            <h3 class="mt-4 text-base font-extrabold text-white">4DX Cinematic Motion</h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              Ghế chuyển động đa chiều kết hợp hiệu ứng gió, nước, mùi hương chân thực.
            </p>
          </div>

          <div
            class="group relative overflow-hidden rounded-[6px] border border-white/10 bg-gradient-to-b from-[#101726] to-[#04060c] p-6 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_12px_30px_rgba(6,182,212,0.15)]"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-[4px] bg-cyan-400/20 text-cyan-400"
            >
              <span class="text-xl font-black">ATMOS</span>
            </div>
            <h3 class="mt-4 text-base font-extrabold text-white">Dolby Atmos Sound</h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              Âm thanh vòm 360 độ di chuyển sống động xung quanh bạn với 64 kênh độc lập.
            </p>
          </div>

          <div
            class="group relative overflow-hidden rounded-[6px] border border-white/10 bg-gradient-to-b from-[#101726] to-[#04060c] p-6 shadow-xl transition-all duration-300 hover:border-purple-400/50 hover:shadow-[0_12px_30px_rgba(168,85,247,0.15)]"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-[4px] bg-purple-400/20 text-purple-400"
            >
              <span class="text-xl font-black">GOLD</span>
            </div>
            <h3 class="mt-4 text-base font-extrabold text-white">Gold Class Luxury</h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              Ghế bọc da ngả lưng cao cấp kèm chăn gối và phục vụ ẩm thực chuẩn 5 sao tận nơi.
            </p>
          </div>
        </div>
      </section>

      <!-- Trailer Modal Dialog -->
      @if (trailerModalUrl()) {
        <div
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-300"
          (click)="closeTrailer()"
          role="dialog"
          aria-modal="true"
        >
          <div
            class="relative w-full max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-slate-950 shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <div
              class="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3"
            >
              <h3 class="font-bold text-white text-sm">
                Trailer: {{ currentTrendingMovie()?.title }}
              </h3>
              <button
                type="button"
                (click)="closeTrailer()"
                class="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Đóng trailer"
              >
                ✕
              </button>
            </div>
            <div class="aspect-video w-full bg-black">
              <iframe
                [src]="trailerModalUrl()"
                class="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </div>
      }
    </main>
  `,
})
export class HomePageComponent implements OnInit, OnDestroy {
  readonly store = inject(CatalogStore);
  readonly showtimesStore = inject(ShowtimesStore);
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  // Promotion Carousel Banners
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

  // Trending Movies Hero Banner
  readonly selectedTrendingIndex = signal(0);
  readonly trendingRowRef = viewChild<ElementRef<HTMLDivElement>>('trendingRow');
  private trendingTimer: ReturnType<typeof setInterval> | null = null;
  private isTrendingPaused = false;
  readonly trailerModalUrl = signal<SafeResourceUrl | null>(null);

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

  readonly currentTrendingMovie = computed<Movie | undefined>(() => {
    const list = this.trendingMovies();
    return list[this.selectedTrendingIndex()] ?? list[0];
  });

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
    this.startTrendingAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    this.stopTrendingAutoSlide();
  }

  // Promotion Carousel handlers
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

  // Trending Movies Hero Banner handlers
  startTrendingAutoSlide(): void {
    this.stopTrendingAutoSlide();
    this.trendingTimer = setInterval(() => {
      if (!this.isTrendingPaused && this.trendingMovies().length > 0) {
        this.stepTrending(1);
      }
    }, 7000);
  }

  stopTrendingAutoSlide(): void {
    if (this.trendingTimer) {
      clearInterval(this.trendingTimer);
      this.trendingTimer = null;
    }
  }

  pauseTrending(): void {
    this.isTrendingPaused = true;
  }

  resumeTrending(): void {
    this.isTrendingPaused = false;
  }

  selectTrending(index: number): void {
    this.selectedTrendingIndex.set(index);
    const movie = this.trendingMovies()[index];
    if (movie) {
      // Also sync quick booking to this movie if available
      const match = this.quickMovies().find(
        (m) => m.slug === movie.slug || String(m.id) === String(movie.id),
      );
      if (match) {
        this.quickMovieId.set(match.slug || String(match.id));
        this.selectFirstQuickDate();
      }
    }
    this.scrollToActiveCard(index);
  }

  stepTrending(direction: number): void {
    const len = this.trendingMovies().length;
    if (len === 0) return;
    const nextIdx = (this.selectedTrendingIndex() + direction + len) % len;
    this.selectTrending(nextIdx);
  }

  scrollToActiveCard(index: number): void {
    const container = this.trendingRowRef()?.nativeElement;
    if (!container) return;
    const targetCard = container.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (targetCard) {
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }

  formatReleaseDate(release?: string): string {
    if (!release) return '02/11';
    if (release.includes('-')) {
      const parts = release.split('-');
      if (parts.length >= 3) {
        return `${parts[2].slice(0, 2)}/${parts[1]}`;
      }
    }
    return release.slice(0, 5);
  }

  openTrailer(trailerUrl?: string): void {
    if (!trailerUrl) return;
    const match =
      trailerUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
      ) || trailerUrl.match(/^[a-zA-Z0-9_-]{11}$/);
    const videoId = match ? match[1] || match[0] : null;
    if (!videoId) return;

    this.trailerModalUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      ),
    );
  }

  closeTrailer(): void {
    this.trailerModalUrl.set(null);
  }

  // QuickBooking Handlers
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
