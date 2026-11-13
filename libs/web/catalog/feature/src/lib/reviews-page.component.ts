import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';
import { movies, type Movie } from '@cinehub/web/shared/util';
import { buildShowtimesQueryParams } from '@cinehub/web/showtimes/util';

export interface MovieReviewItem {
  readonly id: string;
  readonly movieId: string | number;
  readonly movieTitle: string;
  readonly moviePoster: string;
  readonly movieGenre: string;
  readonly movieRating: number;
  readonly authorName: string;
  readonly authorAvatar: string;
  readonly verifiedTicket: boolean;
  readonly cinemaWatched: string;
  readonly formatWatched: string;
  readonly stars: number;
  readonly headline: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly likes: number;
  readonly likedByMe?: boolean;
}

@Component({
  selector: 'ch-reviews-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="min-h-screen bg-[#020617] pb-20 text-white selection:bg-amber-400 selection:text-black"
    >
      <!-- ══════════════════════════════════════════════════════════
           1. HERO BANNER: CỘNG ĐỒNG REVIEW PHIM CINEHUB
      ══════════════════════════════════════════════════════════ -->
      <section
        class="relative overflow-hidden border-b border-white/10 bg-slate-950 py-10 md:py-14"
      >
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            class="absolute -top-20 left-1/3 h-96 w-96 rounded-full bg-[#e50914]/15 blur-[130px]"
          ></div>
          <div
            class="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]"
          ></div>
        </div>

        <div class="relative z-10 mx-auto max-w-[1400px] px-5 md:px-9">
          <div class="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
            <div>
              <span
                class="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/15 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-amber-300"
              >
                ★ Góc Điện Ảnh &amp; Đánh Giá Thực Tế
              </span>
              <h1
                class="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl"
              >
                Review Phim Chiếu Rạp
              </h1>
              <p class="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
                Tổng hợp nhận xét chân thực từ các khán giả đã mua vé trải nghiệm tại hệ thống rạp
                <strong class="text-white">CineHub</strong>. Xem đánh giá kịch bản, kỹ xảo IMAX, âm
                thanh Dolby Atmos trước khi chọn suất chiếu!
              </p>

              <!-- Thống kê nhanh cộng đồng Review -->
              <div class="mt-6 flex flex-wrap items-center gap-6">
                <div>
                  <p class="text-2xl font-black text-amber-400">{{ reviews().length + 1240 }}+</p>
                  <span class="text-xs font-bold text-slate-400">Bài đánh giá xác thực</span>
                </div>
                <div class="h-8 w-px bg-white/15"></div>
                <div>
                  <p class="text-2xl font-black text-white">9.2 / 10</p>
                  <span class="text-xs font-bold text-slate-400">Điểm hài lòng trung bình</span>
                </div>
                <div class="h-8 w-px bg-white/15"></div>
                <button
                  type="button"
                  (click)="showWriteModal.set(true)"
                  class="rounded-xl bg-gradient-to-r from-[#e50914] via-red-500 to-amber-500 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-xl shadow-red-900/40 transition hover:brightness-110 active:scale-95"
                >
                  ✍️ Viết Review phim ngay
                </button>
              </div>
            </div>

            <!-- Top 3 Phim Được Đánh Giá Cao Nhất Tuần Này -->
            <div
              class="rounded-3xl border border-amber-400/40 bg-slate-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
            >
              <div class="mb-4 flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                  🏆 Bảng xếp hạng điểm Review cao nhất
                </span>
                <span class="text-[11px] font-bold text-slate-400">Cập nhật hôm nay</span>
              </div>

              <div class="space-y-3">
                @for (m of topRatedMovies(); track m.id; let idx = $index) {
                  <a
                    [routerLink]="['/movie', m.id]"
                    class="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-2.5 transition hover:border-amber-400"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span
                        class="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-black text-xs"
                        [class]="
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : 'bg-amber-700 text-white'
                        "
                      >
                        #{{ idx + 1 }}
                      </span>
                      <img
                        [src]="m.poster"
                        [alt]="m.title"
                        class="h-12 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/15"
                      />
                      <div class="min-w-0">
                        <p
                          class="truncate text-xs sm:text-sm font-black text-white group-hover:text-amber-300"
                        >
                          {{ m.title }}
                        </p>
                        <p class="truncate text-[11px] text-slate-400">
                          {{ m.genre }} · {{ m.votes || 520 }} lượt chấm điểm
                        </p>
                      </div>
                    </div>

                    <div class="shrink-0 text-right">
                      <span
                        class="inline-block rounded-lg border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 text-xs font-black text-amber-300"
                      >
                        ★ {{ m.rating }}
                      </span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           2. BỘ LỌC PHIM, SỐ SAO & TÌM KIẾM BÀI REVIEW
      ══════════════════════════════════════════════════════════ -->
      <section class="mx-auto max-w-[1400px] px-5 pt-8 md:px-9">
        <div
          class="grid gap-4 rounded-2xl border border-white/15 bg-slate-900/90 p-4 sm:p-5 shadow-xl md:grid-cols-[1.2fr_1fr_.8fr_.8fr]"
        >
          <!-- Tìm kiếm từ khóa -->
          <div>
            <label
              for="rev-search"
              class="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-amber-300"
            >
              Tìm kiếm bài Review
            </label>
            <input
              id="rev-search"
              type="text"
              [value]="searchKeyword()"
              (input)="onSearchInput($event)"
              placeholder="Tên phim, người viết, nội dung..."
              class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-amber-400"
            />
          </div>

          <!-- Lọc theo Phim -->
          <div>
            <label
              for="rev-movie"
              class="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-amber-300"
            >
              Chọn bộ phim
            </label>
            <select
              id="rev-movie"
              [value]="selectedMovieId()"
              (change)="onMovieFilterChange($event)"
              class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-xs sm:text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-amber-400"
            >
              <option value="ALL">Tất cả các bộ phim</option>
              @for (m of allMovies(); track m.id) {
                <option [value]="m.id">{{ m.title }}</option>
              }
            </select>
          </div>

          <!-- Lọc theo Số sao -->
          <div>
            <label
              for="rev-stars"
              class="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-amber-300"
            >
              Mức đánh giá
            </label>
            <select
              id="rev-stars"
              [value]="selectedStars()"
              (change)="onStarsFilterChange($event)"
              class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-xs sm:text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-amber-400"
            >
              <option value="0">Tất cả số sao</option>
              <option value="5">★★★★★ Tuyệt phẩm (5 sao)</option>
              <option value="4">★★★★☆ Rất đáng xem (4 sao)</option>
              <option value="3">★★★☆☆ Khá ổn (3 sao)</option>
            </select>
          </div>

          <!-- Sắp xếp -->
          <div>
            <label
              for="rev-sort"
              class="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-amber-300"
            >
              Sắp xếp theo
            </label>
            <select
              id="rev-sort"
              [value]="sortBy()"
              (change)="onSortChange($event)"
              class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-xs sm:text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-amber-400"
            >
              <option value="popular">Hữu ích nhất (Nhiều lượt thích)</option>
              <option value="newest">Mới đăng gần đây</option>
              <option value="rating">Điểm đánh giá cao nhất</option>
            </select>
          </div>
        </div>

        <!-- Hàng chọn nhanh Phim bằng Poster Pills -->
        <div class="scrollbar-hide mt-5 flex items-center gap-2.5 overflow-x-auto pb-2">
          <button
            type="button"
            (click)="selectedMovieId.set('ALL')"
            class="shrink-0 rounded-full border px-4 py-2 text-xs font-black transition"
            [class]="
              selectedMovieId() === 'ALL'
                ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'border-white/20 bg-slate-900 text-slate-300 hover:border-amber-400 hover:text-white'
            "
          >
            Tất cả ({{ reviews().length }})
          </button>
          @for (m of featuredFilterMovies(); track m.id) {
            <button
              type="button"
              (click)="selectedMovieId.set(String(m.id))"
              class="flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3.5 text-xs font-bold transition"
              [class]="
                selectedMovieId() === String(m.id)
                  ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : 'border-white/20 bg-slate-900 text-slate-200 hover:border-amber-400'
              "
            >
              <img [src]="m.poster" [alt]="m.title" class="h-6 w-6 rounded-full object-cover" />
              <span class="max-w-[150px] truncate">{{ m.title }}</span>
            </button>
          }
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           3. DANH SÁCH BÀI REVIEW CHI TIẾT
      ══════════════════════════════════════════════════════════ -->
      <section class="mx-auto max-w-[1400px] px-5 pt-7 md:px-9">
        <div class="grid gap-6 lg:grid-cols-2">
          @for (rev of filteredReviews(); track rev.id) {
            <article
              class="flex flex-col justify-between rounded-3xl border border-white/15 bg-slate-900/90 p-5 sm:p-6 shadow-xl transition hover:border-amber-400/50"
            >
              <div>
                <!-- Header: Thông tin phim được review -->
                <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div class="flex items-center gap-3.5 min-w-0">
                    <a [routerLink]="['/movie', rev.movieId]" class="shrink-0">
                      <img
                        [src]="rev.moviePoster"
                        [alt]="rev.movieTitle"
                        class="h-16 w-12 rounded-xl object-cover shadow ring-1 ring-white/20"
                      />
                    </a>
                    <div class="min-w-0">
                      <a
                        [routerLink]="['/movie', rev.movieId]"
                        class="block truncate text-base font-black text-white hover:text-amber-300"
                      >
                        {{ rev.movieTitle }}
                      </a>
                      <p class="truncate text-xs font-semibold text-amber-300">
                        {{ rev.movieGenre }} · Điểm phim: ★ {{ rev.movieRating }}/10
                      </p>
                    </div>
                  </div>

                  <!-- Số sao đánh giá của người dùng -->
                  <div
                    class="shrink-0 rounded-2xl border border-amber-400/40 bg-slate-950 px-3 py-1.5 text-right"
                  >
                    <div class="text-xs tracking-wider text-amber-400">
                      {{ renderStars(rev.stars) }}
                    </div>
                    <span class="text-[11px] font-black text-white">{{ rev.stars }}.0 / 5</span>
                  </div>
                </div>

                <!-- Người viết Review & Chứng nhận Đã mua vé -->
                <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#e50914] to-amber-500 text-xs font-black text-white"
                    >
                      {{ rev.authorName.slice(0, 1).toUpperCase() }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-black text-white">{{ rev.authorName }}</span>
                        @if (rev.verifiedTicket) {
                          <span
                            class="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
                          >
                            ✓ Đã mua vé tại CineHub
                          </span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-400">
                        Trải nghiệm tại {{ rev.cinemaWatched }} ({{ rev.formatWatched }}) ·
                        {{ rev.createdAt }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Tiêu đề & Nội dung bài Review -->
                <h3 class="mt-4 text-base sm:text-lg font-black text-white">
                  "{{ rev.headline }}"
                </h3>
                <p class="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                  {{ rev.content }}
                </p>

                <!-- Tags cảm nhận -->
                <div class="mt-4 flex flex-wrap gap-1.5">
                  @for (tag of rev.tags; track tag) {
                    <span
                      class="rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-amber-300"
                    >
                      #{{ tag }}
                    </span>
                  }
                </div>
              </div>

              <!-- Footer: Nút Hữu ích & Đặt vé xem phim -->
              <div
                class="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"
              >
                <button
                  type="button"
                  (click)="toggleLikeReview(rev.id)"
                  class="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition"
                  [class]="
                    rev.likedByMe
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-white/15 bg-slate-950 text-slate-300 hover:border-amber-400 hover:text-white'
                  "
                >
                  <span>👍 Hữu ích ({{ rev.likes }})</span>
                </button>

                <div class="flex items-center gap-2">
                  <a
                    [routerLink]="['/movie', rev.movieId]"
                    class="rounded-xl border border-white/20 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
                  >
                    Chi tiết phim
                  </a>
                  <a
                    [routerLink]="['/showtimes']"
                    [queryParams]="getShowtimesParams(rev.movieId)"
                    class="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white transition hover:bg-red-500"
                  >
                    Đặt vé ngay
                  </a>
                </div>
              </div>
            </article>
          } @empty {
            <div
              class="col-span-full rounded-3xl border border-white/15 bg-slate-900/90 p-12 text-center space-y-3"
            >
              <p class="text-base font-black text-white">
                Chưa có bài review nào khớp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                (click)="resetFilters()"
                class="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950"
              >
                Xem tất cả bài Review
              </button>
            </div>
          }
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           4. MODAL VIẾT REVIEW PHIM MỚI
      ══════════════════════════════════════════════════════════ -->
      @if (showWriteModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Viết đánh giá phim"
          (click)="showWriteModal.set(false)"
        >
          <div
            class="relative my-auto w-full max-w-[560px] rounded-3xl border-2 border-amber-400/50 bg-slate-900 p-6 sm:p-8 text-white shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Chia sẻ trải nghiệm điện ảnh
                </span>
                <h2 class="mt-1 text-xl font-black text-white">Viết Review Phim</h2>
              </div>
              <button
                type="button"
                (click)="showWriteModal.set(false)"
                class="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-slate-950 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="writeForm" (ngSubmit)="submitNewReview()" class="mt-5 space-y-4">
              <div>
                <label for="wr-movie" class="mb-1.5 block text-xs font-bold text-slate-300">
                  Chọn bộ phim bạn muốn đánh giá
                </label>
                <select
                  id="wr-movie"
                  formControlName="movieId"
                  class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-amber-400"
                >
                  @for (m of allMovies(); track m.id) {
                    <option [value]="m.id">{{ m.title }}</option>
                  }
                </select>
              </div>

              <!-- Chọn số sao -->
              <div>
                <span class="mb-1.5 block text-xs font-bold text-slate-300">
                  Chấm điểm bộ phim ({{ newReviewStars() }}/5 sao)
                </span>
                <div class="flex items-center gap-2">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      (click)="newReviewStars.set(star)"
                      class="rounded-xl border px-3.5 py-2 text-sm font-black transition"
                      [class]="
                        newReviewStars() >= star
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-white/15 bg-slate-950 text-slate-500'
                      "
                    >
                      ★ {{ star }}
                    </button>
                  }
                </div>
              </div>

              <div>
                <label for="wr-headline" class="mb-1.5 block text-xs font-bold text-slate-300">
                  Tiêu đề ngắn gọn
                </label>
                <input
                  id="wr-headline"
                  type="text"
                  formControlName="headline"
                  placeholder="VD: Kỹ xảo IMAX đỉnh cao, âm thanh cực kỳ sống động!"
                  class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label for="wr-content" class="mb-1.5 block text-xs font-bold text-slate-300">
                  Nội dung cảm nhận chi tiết
                </label>
                <textarea
                  id="wr-content"
                  rows="4"
                  formControlName="content"
                  placeholder="Chia sẻ cảm nhận của bạn về cốt truyện, diễn xuất, góc nhìn ghế 3D POV tại rạp..."
                  class="w-full rounded-xl border border-white/20 bg-slate-950 p-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400"
                ></textarea>
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="showWriteModal.set(false)"
                  class="rounded-xl border border-white/20 bg-slate-800 px-5 py-2.5 text-xs font-bold text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  class="rounded-xl bg-[#e50914] px-6 py-2.5 text-xs sm:text-sm font-black text-white shadow-lg transition hover:bg-red-500"
                >
                  Đăng bài Review
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </main>
  `,
})
export class ReviewsPageComponent {
  readonly catalogStore = inject(CatalogStore);
  readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly String = String;

  readonly allMovies = computed<readonly Movie[]>(() => {
    const list = this.catalogStore.movies();
    return list.length > 0 ? list : movies;
  });

  readonly topRatedMovies = computed(() =>
    [...this.allMovies()].sort((a, b) => b.rating - a.rating).slice(0, 3),
  );

  readonly featuredFilterMovies = computed(() => this.allMovies().slice(0, 8));

  readonly searchKeyword = signal('');
  readonly selectedMovieId = signal<string>('ALL');
  readonly selectedStars = signal<number>(0);
  readonly sortBy = signal<'popular' | 'newest' | 'rating'>('popular');
  readonly showWriteModal = signal(false);
  readonly newReviewStars = signal(5);

  readonly reviews = signal<MovieReviewItem[]>([
    {
      id: 'rv-1',
      movieId: movies[5]?.id ?? '353debbc-e2e9-416f-9be8-69700eecd3a8',
      movieTitle: movies[5]?.title ?? 'Avengers: Ngày Tận Thế',
      moviePoster:
        movies[5]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/3/26/doomsday-500_1774497990484.jpg',
      movieGenre: movies[5]?.genre ?? 'Hành động, Phiêu lưu, Giả Tưởng',
      movieRating: movies[5]?.rating ?? 9.7,
      authorName: 'Nguyễn Bảo Ngân',
      authorAvatar: '',
      verifiedTicket: true,
      cinemaWatched: 'Galaxy Sala',
      formatWatched: 'IMAX Laser 3D',
      stars: 5,
      headline:
        'Siêu phẩm mãn nhãn nhất năm, chọn ghế bằng 3D POV trên CineHub chuẩn từng góc nhìn!',
      content:
        'Mình đặt ghế G7-G8 sau khi xem trước góc nhìn màn hình bằng tính năng 3D POV của CineHub. Khi vào rạp góc nhìn giống hệt 100%! Kỹ xảo đại chiến đa vũ trụ và âm thanh vòm khiến cả khán phòng nổi da gà từ đầu tới cuối.',
      tags: ['KỹXảoĐỉnhCao', 'IMAXLaser', '3DPOVChuẩnXác', 'ĐángXemNhấtNăm'],
      createdAt: '2 giờ trước',
      likes: 128,
    },
    {
      id: 'rv-2',
      movieId: movies[4]?.id ?? 'e2a74c63-c131-4764-9786-17a1f19ef49b',
      movieTitle: movies[4]?.title ?? 'Dune: Hành Tinh Cát - Phần 3',
      moviePoster:
        movies[4]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/3/23/dune-3-500_1774257657765.jpg',
      movieGenre: movies[4]?.genre ?? 'Hành động, Giả Tưởng',
      movieRating: movies[4]?.rating ?? 8.6,
      authorName: 'Trần Minh Quân',
      authorAvatar: '',
      verifiedTicket: true,
      cinemaWatched: 'Galaxy Nguyễn Du',
      formatWatched: '2D Dolby Atmos',
      stars: 5,
      headline: 'Denis Villeneuve tiếp tục tạo nên kiệt tác điện ảnh kết hợp nhạc nền Hans Zimmer',
      content:
        'Từng khung hình sa mạc Arrakis hiện lên hùng vĩ và choáng ngợp. Nhạc nền của Hans Zimmer dồn dập trong hệ thống loa Dolby Atmos làm mình không thể rời mắt một giây nào. Rất khuyến khích chọn ghế hàng F hoặc G trung tâm!',
      tags: ['HansZimmer', 'KiệtTácSciFi', 'DolbyAtmos', 'DiễnXuấtĐỉnh'],
      createdAt: 'Hôm qua',
      likes: 94,
    },
    {
      id: 'rv-3',
      movieId: movies[0]?.id ?? 'e2308892-7a93-4845-8849-2cefde6f2d1d',
      movieTitle: movies[0]?.title ?? 'Loạn Thế',
      moviePoster:
        movies[0]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/5/12/loan-the-500_1778569122373.jpg',
      movieGenre: movies[0]?.genre ?? 'Hành động',
      movieRating: movies[0]?.rating ?? 8.5,
      authorName: 'Lê Hoàng Nam',
      authorAvatar: '',
      verifiedTicket: true,
      cinemaWatched: 'Galaxy Tân Bình',
      formatWatched: '2D Standard',
      stars: 5,
      headline: 'Võ thuật cổ trang Việt Nam được đầu tư chỉn chu và giàu cảm xúc',
      content:
        'Các phân cảnh hành động võ thuật được quay one-shot rất thật và có lực. Bối cảnh và phục trang tái hiện không khí nghĩa hiệp hào hùng, kịch bản nhiều nútắt bất ngờ ở 30 phút cuối.',
      tags: ['PhimViệtChấtLượng', 'HànhĐộngMãnNhãn', 'CốtTruyệnHay'],
      createdAt: '3 ngày trước',
      likes: 67,
    },
    {
      id: 'rv-4',
      movieId: movies[3]?.id ?? '7c3b8b99-1256-4bf4-b353-e452b20191cb',
      movieTitle: movies[3]?.title ?? 'Huyết Thống',
      moviePoster:
        movies[3]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/8/24/huyet-thong-500_1787560056984.jpg',
      movieGenre: movies[3]?.genre ?? 'Kinh dị',
      movieRating: movies[3]?.rating ?? 8.5,
      authorName: 'Phạm Thu Hà',
      authorAvatar: '',
      verifiedTicket: true,
      cinemaWatched: 'Galaxy Kinh Dương Vương',
      formatWatched: '2D Atmos',
      stars: 4,
      headline: 'Bầu không khí tâm linh ám ảnh, diễn xuất của Quang Tuấn quá xuất sắc!',
      content:
        'Không lạm dụng hù dọa rẻ tiền mà đi sâu vào tâm lý và bí mật gia tộc. Xem suất tối 21:30 cùng bạn bè cực kỳ cuốn, thông điệp về tình thân ở đoạn kết để lại nhiều suy ngẫm.',
      tags: ['KinhDịTâmLinh', 'QuangTuấn', 'ĐángĐồngTiềnVé'],
      createdAt: '5 ngày trước',
      likes: 53,
    },
  ]);

  readonly writeForm = this.fb.nonNullable.group({
    movieId: [String(movies[5]?.id ?? movies[0]?.id ?? '')],
    headline: [''],
    content: [''],
  });

  readonly filteredReviews = computed(() => {
    const kw = this.searchKeyword().trim().toLowerCase();
    const movieId = this.selectedMovieId();
    const stars = this.selectedStars();
    const sort = this.sortBy();

    const filtered = this.reviews().filter((item) => {
      if (movieId !== 'ALL' && String(item.movieId) !== movieId) {
        return false;
      }
      if (stars > 0 && item.stars !== stars) {
        return false;
      }
      if (
        kw &&
        !item.movieTitle.toLowerCase().includes(kw) &&
        !item.headline.toLowerCase().includes(kw) &&
        !item.content.toLowerCase().includes(kw) &&
        !item.authorName.toLowerCase().includes(kw)
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'popular') return b.likes - a.likes;
      if (sort === 'rating') return b.stars - a.stars;
      return 0;
    });
  });

  renderStars(count: number): string {
    return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
  }

  onSearchInput(event: Event): void {
    this.searchKeyword.set((event.target as HTMLInputElement).value);
  }

  onMovieFilterChange(event: Event): void {
    this.selectedMovieId.set((event.target as HTMLSelectElement).value);
  }

  onStarsFilterChange(event: Event): void {
    this.selectedStars.set(Number((event.target as HTMLSelectElement).value));
  }

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as 'popular' | 'newest' | 'rating');
  }

  resetFilters(): void {
    this.searchKeyword.set('');
    this.selectedMovieId.set('ALL');
    this.selectedStars.set(0);
  }

  toggleLikeReview(id: string): void {
    this.reviews.update((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        const nextLiked = !item.likedByMe;
        return {
          ...item,
          likedByMe: nextLiked,
          likes: nextLiked ? item.likes + 1 : Math.max(0, item.likes - 1),
        };
      }),
    );
  }

  getShowtimesParams(movieId: string | number): Record<string, string> {
    const found = this.allMovies().find((m) => String(m.id) === String(movieId));
    return found ? buildShowtimesQueryParams(found) : {};
  }

  submitNewReview(): void {
    const raw = this.writeForm.getRawValue();
    if (!raw.headline.trim() || !raw.content.trim()) {
      this.toast.show('Vui lòng nhập tiêu đề và nội dung cảm nhận của bạn.', 'warning');
      return;
    }
    const targetMovie =
      this.allMovies().find((m) => String(m.id) === String(raw.movieId)) ?? this.allMovies()[0];
    if (!targetMovie) return;

    const newEntry: MovieReviewItem = {
      id: `rv-${Date.now()}`,
      movieId: targetMovie.id,
      movieTitle: targetMovie.title,
      moviePoster: targetMovie.poster,
      movieGenre: targetMovie.genre,
      movieRating: targetMovie.rating || 9.0,
      authorName: this.authStore.isAuthenticated()
        ? this.authStore.displayName()
        : 'Nguyễn Bảo Ngân',
      authorAvatar: '',
      verifiedTicket: true,
      cinemaWatched: 'Galaxy Nguyễn Du',
      formatWatched: 'IMAX 3D',
      stars: this.newReviewStars(),
      headline: raw.headline.trim(),
      content: raw.content.trim(),
      tags: ['ReviewThựcTế', 'CineHubVIP'],
      createdAt: 'Vừa xong',
      likes: 1,
      likedByMe: true,
    };

    this.reviews.update((list) => [newEntry, ...list]);
    this.writeForm.patchValue({ headline: '', content: '' });
    this.showWriteModal.set(false);
    this.toast.show(`Đã đăng bài review cho phim "${targetMovie.title}"!`, 'success');
  }
}
