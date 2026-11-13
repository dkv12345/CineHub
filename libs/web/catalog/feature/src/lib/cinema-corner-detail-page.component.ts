import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { CINEMA_CORNER_ARTICLES } from './cinema-corner.data';

@Component({
  selector: 'ch-cinema-corner-detail-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (article(); as item) {
      @if (item.layout === 'kids-magazine') {
        <!-- Kids / Family Double-Page Sky-Blue Cloud Magazine Spread -->
        <article
          class="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 pb-16 text-white"
        >
          <!-- Soft Fluffy Cloud Decor -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-white/20 blur-3xl"
          ></div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute right-10 top-16 h-72 w-96 rounded-full bg-white/25 blur-3xl"
          ></div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute bottom-10 left-0 h-96 w-full bg-gradient-to-t from-white/30 via-white/10 to-transparent"
          ></div>

          <div class="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <!-- Top Navigation -->
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
              <a
                routerLink="/cinema-corner"
                class="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/30"
              >
                <span>←</span>
                <span>Quay lại Góc điện ảnh</span>
              </a>

              <a
                [routerLink]="['/movie', item.movieId]"
                class="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-sky-900/20 transition hover:bg-amber-200"
              >
                <span>Xem phim & Đặt vé</span>
                <span>→</span>
              </a>
            </div>

            <!-- Double-Page Magazine Spread Card -->
            <div
              class="overflow-hidden rounded-[2rem] border border-white/40 bg-gradient-to-br from-sky-400/90 via-sky-500/95 to-blue-600/95 shadow-[0_25px_70px_rgba(3,57,108,0.45)]"
            >
              <div class="grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:gap-10">
                <!-- LEFT PAGE: Magazine Kicker + Floating Key Art / Poster + Bottom-Left Quote -->
                <div class="flex flex-col justify-between gap-6 lg:col-span-5">
                  <div>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm"
                      >
                        ★ Ý kiến bạn đọc · Phim thiếu nhi
                      </span>
                      <span
                        class="rounded-full bg-amber-300 px-3 py-1 text-[11px] font-black text-slate-950 shadow"
                      >
                        {{ item.ageRating }} · {{ item.rating.toFixed(1) }}/10
                      </span>
                    </div>

                    <!-- Prominent Poster / Key Art -->
                    <div class="relative mt-5">
                      <div
                        class="overflow-hidden rounded-3xl border-4 border-white/80 bg-sky-200 shadow-[0_20px_50px_rgba(12,74,110,0.45)]"
                      >
                        <img
                          [src]="item.posterUrl"
                          [alt]="item.title"
                          class="aspect-[3/4] w-full object-cover"
                        />
                      </div>
                      <div
                        class="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-white/95"
                      >
                        <span class="rounded-full bg-white/20 px-3 py-1">{{ item.year }}</span>
                        <span class="rounded-full bg-white/20 px-3 py-1">{{ item.duration }}</span>
                        <span class="rounded-full bg-white/20 px-3 py-1">{{ item.genre }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom-Left Editorial Quote Box (matching UP spread) -->
                  <div
                    class="rounded-2xl border-l-4 border-amber-300 bg-white/15 p-5 text-sm italic leading-relaxed text-white shadow-inner backdrop-blur-md"
                  >
                    “{{ item.quoteBox || item.synopsis }}”
                  </div>
                </div>

                <!-- RIGHT PAGE: Display Header + Tilted Scene Polaroid + 3-Col Story + 3 Cloud Feature Cards -->
                <div class="flex flex-col justify-between gap-6 lg:col-span-7">
                  <!-- Top Row: Headline & Lead + Tilted Scene Frame -->
                  <div class="grid items-center gap-5 sm:grid-cols-12">
                    <div class="sm:col-span-7">
                      <p class="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-200">
                        {{ item.director }}
                      </p>
                      <h1
                        class="mt-1 text-3xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_3px_10px_rgba(12,74,110,0.4)] sm:text-4xl"
                      >
                        {{ item.title }}
                      </h1>
                      <p class="mt-2 text-base font-bold italic text-amber-200">
                        {{ item.subtitle }}
                      </p>
                      <p class="mt-3 text-sm leading-relaxed text-white/95">
                        {{ item.synopsis }}
                      </p>
                    </div>

                    <!-- Tilted Polaroid Scene Card (like Carl & Ellie top-right frame) -->
                    @if (item.stills[0]; as leadStill) {
                      <div class="sm:col-span-5">
                        <div
                          class="rotate-2 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl transition duration-300 hover:rotate-0"
                        >
                          <img
                            [src]="leadStill.url"
                            [alt]="leadStill.alt"
                            class="aspect-[4/3] w-full object-cover"
                          />
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Middle Row: 3-Column Magazine Body -->
                  <div class="grid grid-cols-1 gap-4 border-t border-white/25 pt-5 md:grid-cols-3">
                    @for (paragraph of item.paragraphs; track $index) {
                      <p class="text-[13px] leading-relaxed text-white/95">
                        {{ paragraph }}
                      </p>
                    }
                  </div>

                  <!-- Bottom Row: White Cloud Feature Panel (3 bright cards) -->
                  @if (item.highlightCards?.length) {
                    <div
                      class="rounded-3xl bg-white/95 p-5 text-slate-800 shadow-[0_18px_40px_rgba(12,74,110,0.3)]"
                    >
                      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        @for (card of item.highlightCards; track $index) {
                          <div class="flex flex-col">
                            <h2 class="text-base font-black tracking-tight text-sky-700">
                              {{ card.title }}
                            </h2>
                            @if (item.stills[card.stillIndex]; as cardStill) {
                              <div
                                class="mt-2 overflow-hidden rounded-xl border border-sky-100 bg-sky-50 shadow-sm"
                              >
                                <img
                                  [src]="cardStill.url"
                                  [alt]="cardStill.alt"
                                  class="aspect-[16/10] w-full object-cover"
                                />
                              </div>
                            }
                            <p class="mt-2.5 text-xs leading-relaxed text-slate-600">
                              {{ card.text }}
                            </p>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Full 6-Still Colorful Scene Gallery Strip -->
              <div class="border-t border-white/25 bg-white/10 px-6 py-6 backdrop-blur-sm sm:px-8">
                <p class="mb-3 text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                  Khoảnh khắc rực rỡ trong phim
                </p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  @for (still of item.stills; track $index) {
                    <div
                      class="group overflow-hidden rounded-2xl border-2 border-white/75 bg-white shadow-md"
                    >
                      <img
                        [src]="still.url"
                        [alt]="still.alt"
                        class="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  }
                </div>

                <!-- Footer Credit & CTA -->
                <div
                  class="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-5 text-xs text-white/90 sm:flex-row"
                >
                  <span class="font-semibold italic">
                    CineHub Kids & Family · Khởi chiếu {{ item.release }}
                  </span>
                  <div class="flex flex-wrap items-center gap-3">
                    <a
                      routerLink="/cinema-corner"
                      class="rounded-full border border-white/40 bg-white/15 px-4 py-2 font-bold text-white transition hover:bg-white/25"
                    >
                      Xem bài viết khác
                    </a>
                    <a
                      [routerLink]="['/movie', item.movieId]"
                      class="rounded-full bg-amber-300 px-5 py-2 font-black text-slate-950 shadow transition hover:bg-amber-200"
                    >
                      Đặt vé cho cả nhà
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      } @else {
        <article class="min-h-screen bg-[#05060a] pb-16 text-slate-100">
          <!-- Editorial Container matching reference card poster-blog layout -->
          <div class="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
              <a
                routerLink="/cinema-corner"
                class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
              >
                <span>←</span>
                <span>Quay lại Góc điện ảnh</span>
              </a>

              <a
                [routerLink]="['/movie', item.movieId]"
                class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e50914] to-amber-500 px-5 py-2 text-xs font-black text-white shadow-lg shadow-red-900/40 transition hover:brightness-110"
              >
                <span>Xem phim & Đặt vé</span>
                <span>→</span>
              </a>
            </div>

            <div
              class="overflow-hidden rounded-3xl border border-white/10 bg-[#08090d] shadow-[0_25px_70px_rgba(0,0,0,0.85)]"
            >
              <!-- 1. Hero Backdrop with Overlaid Title -->
              <div class="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/10]">
                <img
                  [src]="item.backdropUrl"
                  [alt]="item.title"
                  class="h-full w-full object-cover object-center"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/45 to-transparent"
                ></div>

                <div class="absolute bottom-4 left-5 right-5 sm:bottom-6 sm:left-8 sm:right-8">
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/90">
                    Góc Điện Ảnh · CineHub Review
                  </p>
                  <h1
                    class="mt-1 text-2xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] sm:text-4xl md:text-5xl"
                  >
                    {{ item.title }}
                  </h1>
                </div>
              </div>

              <!-- 2. Poster + Metadata + Rating Donut Strip -->
              <div class="px-5 py-6 sm:px-8 sm:py-8">
                <div class="grid items-center gap-6 md:grid-cols-12">
                  <!-- Poster -->
                  <div class="mx-auto w-36 shrink-0 sm:w-40 md:col-span-3 md:mx-0 md:w-full">
                    <div
                      class="overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-2xl"
                    >
                      <img
                        [src]="item.posterUrl"
                        [alt]="item.title"
                        class="aspect-[2/3] w-full object-cover"
                      />
                    </div>
                  </div>

                  <!-- Metadata Pill + Synopsis + Starring -->
                  <div class="space-y-3.5 text-center md:col-span-6 md:text-left">
                    <div
                      class="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-4 py-1.5 text-xs font-bold text-white md:justify-start"
                    >
                      <span>{{ item.year }}</span>
                      <span class="text-slate-500">|</span>
                      <span>{{ item.ageRating }}</span>
                      <span class="text-slate-500">|</span>
                      <span>{{ item.duration }}</span>
                      <span class="text-slate-500">|</span>
                      <span class="text-amber-300">{{ item.genre }}</span>
                    </div>

                    <p class="text-sm leading-relaxed text-slate-200">
                      {{ item.synopsis }}
                    </p>

                    <div class="space-y-1 text-xs text-slate-300">
                      <p>
                        <span
                          class="font-bold text-white underline decoration-white/40 underline-offset-4"
                        >
                          Đạo diễn :
                        </span>
                        <span class="ml-1 text-slate-200">{{ item.director }}</span>
                      </p>
                      <p>
                        <span
                          class="font-bold text-white underline decoration-white/40 underline-offset-4"
                        >
                          Diễn viên :
                        </span>
                        <span class="ml-1 text-slate-200">{{ item.cast }}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Circular Rating Ring (Donut) -->
                  <div class="flex flex-col items-center justify-center md:col-span-3">
                    <div class="relative flex h-28 w-28 items-center justify-center">
                      <svg class="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.12)"
                          stroke-width="10"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="url(#ratingGrad)"
                          stroke-width="10"
                          stroke-linecap="round"
                          [attr.stroke-dasharray]="circumference"
                          [attr.stroke-dashoffset]="dashOffset(item.rating)"
                        />
                        <defs>
                          <linearGradient id="ratingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#7c3aed" />
                            <stop offset="100%" stop-color="#f59e0b" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-base font-black text-white">{{ item.rating }}/10</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          CineHub
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3. 6-Still Scene Grid (2 rows x 3 cols) -->
                <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  @for (still of item.stills; track $index) {
                    <div
                      class="group relative aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-slate-950"
                    >
                      <img
                        [src]="still.url"
                        [alt]="still.alt"
                        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        [class]="still.position"
                      />
                    </div>
                  }
                </div>

                <!-- 4. Editorial Blog Content -->
                <div class="mx-auto mt-10 max-w-2xl space-y-5">
                  <h2 class="text-center text-lg font-black leading-snug text-amber-300 sm:text-xl">
                    {{ item.headline }}
                  </h2>

                  @for (paragraph of item.paragraphs; track $index) {
                    <p class="text-[15px] leading-relaxed text-slate-200/95">
                      {{ paragraph }}
                    </p>
                  }
                </div>

                <!-- 5. Bottom Editorial Credit & Navigation -->
                <div
                  class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row"
                >
                  <span class="italic">CineHub Editorial · Góc Điện Ảnh</span>
                  <div class="flex flex-wrap items-center gap-3">
                    <a
                      routerLink="/cinema-corner"
                      class="rounded-full border border-white/15 px-4 py-2 font-bold text-slate-200 transition hover:border-white/40 hover:text-white"
                    >
                      Xem bài viết khác
                    </a>
                    <a
                      [routerLink]="['/movie', item.movieId]"
                      class="rounded-full bg-amber-400 px-4 py-2 font-black text-slate-950 transition hover:brightness-110"
                    >
                      Đặt vé phim này
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      }
    } @else {
      <div class="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 class="text-2xl font-black text-white">Không tìm thấy bài viết</h1>
        <p class="mt-2 text-sm text-slate-400">
          Bài bình luận phim bạn đang tìm hiện không tồn tại hoặc đã được chuyển mục.
        </p>
        <a
          routerLink="/cinema-corner"
          class="mt-6 inline-block rounded-full bg-amber-400 px-6 py-2.5 text-xs font-black text-slate-950"
        >
          Về Góc điện ảnh
        </a>
      </div>
    }
  `,
})
export class CinemaCornerDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('slug') ?? '',
  });

  readonly article = computed(
    () => CINEMA_CORNER_ARTICLES.find((a) => a.slug === this.slug()) ?? CINEMA_CORNER_ARTICLES[0],
  );

  readonly circumference = 2 * Math.PI * 40;

  dashOffset(rating: number): number {
    const ratio = Math.max(0, Math.min(1, rating / 10));
    return this.circumference * (1 - ratio);
  }
}
