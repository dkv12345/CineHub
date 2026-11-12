import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { buildShowtimesLink, filterShowtimes, vietnamDate } from '@cinehub/web/showtimes/util';

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
              class="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-950 text-white shadow-lg backdrop-blur transition hover:border-amber-300 hover:bg-amber-400 hover:text-black"
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
                  class="h-2 rounded-full transition-all"
                  [class]="
                    currentSlide() === idx
                      ? 'w-8 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)]'
                      : 'w-3 bg-white/70'
                  "
                ></button>
              }
            </div>

            <button
              type="button"
              (click)="stepSlide(1)"
              aria-label="Slide sau"
              class="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-950 text-white shadow-lg backdrop-blur transition hover:border-amber-300 hover:bg-amber-400 hover:text-black"
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

      <!-- 2. Thanh QuickBooking Mua vé nhanh nằm tách biệt dưới Hero -->
      <div class="relative z-10 mx-auto mt-6 max-w-[1400px] px-5 md:mt-8 md:px-9">
        <section
          class="grid gap-3 rounded-2xl border-2 border-white/40 bg-slate-900 p-4 shadow-2xl shadow-black/90 ring-1 ring-white/20 backdrop-blur-2xl md:grid-cols-[1.15fr_1.15fr_.8fr_.8fr_auto] md:items-end md:p-5"
          aria-label="Đặt vé nhanh"
        >
          <!-- Chọn phim -->
          <label class="min-w-0 text-xs font-black uppercase tracking-wider text-amber-300">
            Chọn phim
            <div class="relative mt-2">
              <select
                [value]="quickMovieId()"
                (change)="onQuickMovieChange($event)"
                [disabled]="showtimesStore.loading() || quickMovies().length === 0"
                class="block w-full appearance-none rounded-xl border-2 border-white/80 bg-slate-950 py-3 pl-3.5 pr-10 text-sm font-black text-white outline-none transition [color-scheme:dark] hover:border-white focus:border-amber-300"
              >
                @if (quickMovies().length === 0) {
                  <option value="">Chưa có phim có suất chiếu</option>
                } @else {
                  @for (m of quickMovies(); track m.id) {
                    <option [value]="m.slug || m.id" class="bg-slate-900 font-black text-white">
                      {{ m.title }}
                    </option>
                  }
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn rạp -->
          <label class="min-w-0 text-xs font-black uppercase tracking-wider text-amber-300">
            Chọn rạp
            <div class="relative mt-2">
              <select
                [value]="quickCinemaId()"
                (change)="onQuickCinemaChange($event)"
                [disabled]="showtimesStore.loading() || quickMovies().length === 0"
                class="block w-full appearance-none rounded-xl border-2 border-white/80 bg-slate-950 py-3 pl-3.5 pr-10 text-sm font-black text-white outline-none transition [color-scheme:dark] hover:border-white focus:border-amber-300"
              >
                <option value="" class="bg-slate-900 font-black text-white">Tất cả rạp</option>
                @for (c of cinemaList(); track c.id) {
                  <option [value]="c.id" class="bg-slate-900 font-black text-white">
                    {{ c.name }}
                  </option>
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn ngày -->
          <label class="min-w-0 text-xs font-black uppercase tracking-wider text-amber-300">
            Chọn ngày
            <div class="relative mt-2">
              <select
                (change)="onQuickDayChange($event)"
                [value]="quickShowtimeDate()"
                [disabled]="showtimesStore.loading() || quickDateOptions().length === 0"
                class="block w-full appearance-none rounded-xl border-2 border-white/80 bg-slate-950 py-3 pl-3.5 pr-10 text-sm font-black text-white outline-none transition [color-scheme:dark] hover:border-white focus:border-amber-300 disabled:opacity-50"
              >
                @if (quickDateOptions().length === 0) {
                  <option value="" class="bg-slate-900 font-black text-white">
                    Chưa có suất phù hợp
                  </option>
                } @else {
                  @for (d of quickDateOptions(); track d.date) {
                    <option [value]="d.date" class="bg-slate-900 font-black text-white">
                      {{ d.label }}
                    </option>
                  }
                }
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white"
                >▼</span
              >
            </div>
          </label>

          <!-- Chọn suất -->
          <label class="min-w-0 text-xs font-black uppercase tracking-wider text-amber-300">
            Chọn suất
            <div class="relative mt-2">
              <select
                disabled
                class="block w-full appearance-none rounded-xl border-2 border-white/40 bg-slate-950/60 py-3 pl-3.5 pr-10 text-sm font-black text-white/50 outline-none"
              >
                <option class="bg-slate-900">Xem tại bước sau</option>
              </select>
              <span
                class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40"
                >▼</span
              >
            </div>
          </label>

          <!-- Nút Đặt Vé Nhanh -->
          <button
            type="button"
            (click)="submitQuickBooking()"
            [disabled]="
              showtimesStore.loading() ||
              store.loading() ||
              quickMovies().length === 0 ||
              !quickShowtimeDate()
            "
            aria-label="Mua vé nhanh theo phim, rạp và ngày đã chọn"
            class="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
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

      <!-- 3. Section Top Thịnh Hành (Giant 3D Numbering) -->
      <section class="mx-auto max-w-[1400px] px-5 pt-10 md:px-9 md:pt-14">
        <div class="mb-6 flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              Được khán giả lựa chọn
            </p>
            <h2 class="mt-2 text-2xl font-black text-white">Top thịnh hành</h2>
          </div>
          <a
            [routerLink]="buildShowtimesLink()"
            class="inline-flex items-center gap-1 text-xs font-black text-amber-300 transition hover:text-amber-200"
          >
            Xem lịch chiếu →
          </a>
        </div>

        <div
          class="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 pl-12 pr-6 md:-mx-9 md:pl-14 md:pr-9"
        >
          @for (m of trendingMovies(); track m.id; let idx = $index) {
            <a
              [routerLink]="['/movie', m.id]"
              class="group relative w-[190px] shrink-0 snap-start rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 pt-3 shadow-xl transition hover:border-amber-400 sm:w-[220px]"
            >
              <!-- Số 3D nhô hẳn ra ngoài khung (-left-7) -->
              <span
                class="display absolute -left-7 bottom-10 z-20 font-black leading-none text-amber-300 drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)] transition-all duration-300 group-hover:scale-110 group-hover:text-amber-400"
                [class]="idx >= 9 ? 'text-[100px] tracking-tighter' : 'text-[108px]'"
              >
                {{ idx + 1 }}
              </span>

              <div class="ml-9 overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20">
                <img
                  [src]="m.poster"
                  [alt]="'Poster ' + m.title"
                  class="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <span
                class="mt-3 block truncate pl-9 text-sm font-black text-white transition hover:text-amber-300 group-hover:text-amber-300"
              >
                {{ m.title }}
              </span>
              <span class="block pl-9 text-xs font-black text-amber-300">
                ★ {{ m.rating }} · {{ m.country || 'Quốc tế' }}
              </span>
            </a>
          }
        </div>
      </section>

      <!-- 4. Section CineHub AI Dành riêng cho bạn -->
      <section class="mt-12 border-y-2 border-white/20 bg-slate-900/90 backdrop-blur-md">
        <div
          class="mx-auto grid max-w-[1400px] gap-8 px-5 py-10 md:grid-cols-[.8fr_2fr] md:items-center md:px-9"
        >
          <div>
            <p
              class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400"
            >
              ✨ CineHub AI
            </p>
            <h2 class="mt-2 text-2xl font-black text-white">Dành riêng cho bạn</h2>
            <p class="mt-2 max-w-sm text-sm font-bold leading-6 text-white/80">
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
                class="mt-4 inline-flex items-center gap-2 text-sm font-black text-amber-400 transition hover:text-amber-300"
              >
                Đăng nhập để nhận gợi ý chuẩn gu →
              </a>
            }
          </div>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            @for (m of recommendedMovies(); track m.id) {
              <a
                [routerLink]="['/movie', m.id]"
                class="group flex min-w-0 gap-3 rounded-2xl border-2 border-slate-700 bg-slate-900 p-3 shadow-md transition hover:border-amber-400 hover:bg-slate-800"
              >
                <img
                  [src]="m.poster"
                  [alt]="'Poster ' + m.title"
                  class="h-28 w-[74px] shrink-0 rounded-lg object-cover shadow-md ring-1 ring-white/20"
                />
                <div class="min-w-0 py-1">
                  <h3
                    class="line-clamp-2 text-sm font-black text-white transition hover:text-amber-300 group-hover:text-amber-300"
                  >
                    {{ m.title }}
                  </h3>
                  <p class="mt-2 line-clamp-2 text-xs font-bold leading-5 text-amber-300">
                    {{ m.genre.split(',')[0] }} · Đang được yêu thích
                  </p>
                  <p class="mt-2 text-[11px] font-black text-white">
                    {{ m.age || 'Phim chiếu rạp' }}
                  </p>
                </div>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- 5. Section Thư Viện Của Bạn -->
      <section
        class="mx-auto grid max-w-[1400px] gap-5 px-5 py-14 md:px-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[auto_auto]"
      >
        <aside
          class="h-fit rounded-2xl border-2 border-slate-700 bg-slate-900 p-3 shadow-xl backdrop-blur-md lg:col-start-1 lg:row-start-2"
        >
          <p class="px-3 pb-3 pt-2 text-[11px] font-black uppercase tracking-widest text-amber-300">
            THƯ VIỆN CỦA BẠN
          </p>
          <div class="flex flex-col gap-2">
            @for (item of shelfOptions; track item.key) {
              <button
                type="button"
                (click)="shelf.set(item.key)"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition"
                [class]="
                  shelf() === item.key
                    ? 'border-2 border-amber-400 bg-amber-400/20 font-black text-amber-300 shadow-md'
                    : 'border-2 border-white/40 bg-slate-800 font-black text-white shadow-md hover:bg-slate-700 hover:text-amber-300'
                "
              >
                <span>{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            }
          </div>
        </aside>

        <div class="min-w-0 lg:contents">
          <div class="mb-5 flex items-end justify-between gap-4 lg:col-start-2 lg:row-start-1">
            <div>
              <p class="text-xs font-black uppercase tracking-wider text-amber-400">
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
            <span class="text-xs font-black text-white">{{ shelfMovies().length }} phim</span>
          </div>

          <div
            class="scrollbar-hide -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-3 lg:col-start-2 lg:row-start-2"
          >
            @for (m of shelfMovies(); track m.id) {
              <article
                class="group w-[150px] shrink-0 snap-start overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-lg backdrop-blur sm:w-[170px]"
              >
                <a
                  [routerLink]="['/movie', m.id]"
                  class="relative block aspect-[2/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20"
                >
                  <img
                    [src]="m.poster"
                    [alt]="'Poster ' + m.title"
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span
                    class="absolute right-2 top-2 rounded-full border border-amber-300 bg-slate-950/95 px-2 py-1 text-[10px] font-black text-amber-300 backdrop-blur"
                  >
                    ★ {{ m.rating || 'Mới' }}
                  </span>
                </a>
                <h3
                  class="mt-3 truncate px-1 text-xs font-black text-white transition hover:text-amber-300 group-hover:text-amber-300"
                >
                  {{ m.title }}
                </h3>
                <div
                  class="mt-2 flex items-center justify-between px-1 pb-1 text-[10px] font-bold text-amber-300"
                >
                  <span>{{ m.genre.split(',')[0] }}</span>
                  <span class="text-white/60">{{ m.country || 'Việt Nam' }}</span>
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
            class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
          >
            <span>{{ store.error() }} Đang hiển thị dữ liệu đã có.</span>
            <button type="button" (click)="refreshCatalog()" class="font-black text-amber-200">
              Thử cập nhật lại
            </button>
          </div>
        } @else if (store.loading()) {
          <p role="status" class="mb-5 text-sm font-bold text-slate-300">
            Đang cập nhật danh sách phim mới nhất…
          </p>
        }
        @if (showtimesStore.error()) {
          <div
            role="alert"
            class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
          >
            <span>{{ showtimesStore.error() }}</span>
            <button type="button" (click)="refreshShowtimes()" class="font-black text-amber-200">
              Thử tải lịch lại
            </button>
          </div>
        }
        <div class="mb-5 flex items-center gap-3">
          <span aria-hidden="true" class="h-7 w-1 rounded-full bg-amber-400"></span>
          <h2 class="text-xl font-black uppercase tracking-wide text-white">PHIM</h2>
        </div>

        <!-- Status Tabs: Đang chiếu / Sắp chiếu -->
        <div role="tablist" class="mb-8 flex gap-8 border-b-2 border-white/20">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'now'"
            (click)="activeTab.set('now')"
            class="-mb-px border-b-[3px] pb-4 text-lg transition"
            [class]="
              activeTab() === 'now'
                ? 'border-amber-400 font-black text-amber-300'
                : 'border-transparent font-black text-white hover:text-amber-300'
            "
          >
            Đang chiếu
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'soon'"
            (click)="activeTab.set('soon')"
            class="-mb-px border-b-[3px] pb-4 text-lg transition"
            [class]="
              activeTab() === 'soon'
                ? 'border-amber-400 font-black text-amber-300'
                : 'border-transparent font-black text-white hover:text-amber-300'
            "
          >
            Sắp chiếu
          </button>
        </div>

        <!-- Thể loại Phim Filter Pills -->
        <div
          class="scrollbar-hide mb-7 flex gap-2 overflow-x-auto pb-2"
          aria-label="Lọc theo thể loại phim"
        >
          @for (f of filterOptions(); track f.key) {
            <button
              type="button"
              (click)="catalogFilter.set(f.key)"
              class="shrink-0 rounded-full border-2 px-4 py-2 text-xs font-black transition"
              [class]="
                catalogFilter() === f.key
                  ? 'border-amber-300 bg-amber-400 font-black text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'border-white/60 bg-slate-800 text-white shadow-md hover:border-amber-300 hover:bg-slate-700 hover:text-amber-300'
              "
            >
              {{ f.label }}
            </button>
          }
        </div>

        <!-- Movie Cards Grid -->
        <div class="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          @for (m of displayMovies(); track m.id) {
            <ch-movie-card [movie]="m" />
          } @empty {
            <div
              class="col-span-full rounded-2xl border-2 border-slate-700 bg-slate-900 p-12 text-center text-sm font-bold text-white/60"
            >
              Không tìm thấy bộ phim phù hợp với bộ lọc hiện tại.
            </div>
          }
        </div>
      </section>

      <!-- 7. Member Promo Callout Banner -->
      <section class="mx-auto max-w-[1400px] px-5 pb-14 md:px-9">
        <div
          class="flex flex-col gap-5 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/50 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/20 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div>
            <p class="text-xs font-black uppercase tracking-widest text-amber-400">
              Ưu đãi thành viên
            </p>
            <h2 class="mt-2 text-2xl font-black text-white">Một vé hay, thêm một niềm vui</h2>
            <p class="mt-2 text-sm font-extrabold text-white">
              Nhập mã <b class="font-black text-amber-300">CINEHUB20</b> để nhận ưu đãi 20.000₫ cho
              vé tiếp theo.
            </p>
          </div>
          <a
            [routerLink]="buildShowtimesLink()"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
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
    { key: 'history' as const, label: 'Lịch sử / Xem tiếp', icon: '🕒' },
    { key: 'collection' as const, label: 'Bộ sưu tập', icon: '❤️' },
    { key: 'trending' as const, label: 'Đang thịnh hành', icon: '✨' },
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
    const list = [...this.nowShowingMovies(), ...this.comingSoonMovies()];
    if (this.shelf() === 'trending') {
      return this.trendingMovies().slice(0, 6);
    }
    return list.slice(0, 6);
  });

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
      this.store.loading() ||
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
    if (this.showtimesStore.loading()) return movie.status === 'now';
    if (!this.showtimesStore.fetchedAt() || this.showtimesStore.error()) {
      return movie.status === 'now';
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
    if (!movie.release || movie.release === 'Đang chiếu') return false;

    const releaseDate = movie.startDate?.slice(0, 10);
    if (releaseDate && /^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
      return releaseDate >= vietnamDate();
    }

    const [day, month, year] = movie.release.split('/');
    if (day && month && year) {
      const normalizedRelease = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return normalizedRelease >= vietnamDate();
    }

    return movie.status === 'soon';
  }
}
