import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CINEMA_CORNER_ARTICLES } from './cinema-corner.data';

@Component({
  selector: 'ch-cinema-corner-list-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <!-- Header -->
      <div
        class="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300"
          >
            Góc điện ảnh · CineHub Journal
          </span>
          <h1 class="mt-2.5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Bình luận & Góc nhìn Điện ảnh
          </h1>
          <p class="mt-1.5 max-w-2xl text-sm text-slate-400">
            Tuyển chọn các bài viết phân tích chiều sâu nhân vật, thông điệp và câu chuyện đằng sau
            những tác phẩm đáng chú ý tại rạp.
          </p>
        </div>
        <span class="text-xs font-bold text-slate-400">
          {{ articles.length }} bài viết nổi bật
        </span>
      </div>

      <!-- Featured Lead Article -->
      @if (leadArticle) {
        <a
          [routerLink]="['/cinema-corner', leadArticle.slug]"
          class="group relative mb-10 grid overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl transition hover:border-amber-400/40 lg:grid-cols-12"
        >
          <div
            class="relative aspect-[16/10] overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[340px]"
          >
            <img
              [src]="leadArticle.backdropUrl"
              [alt]="leadArticle.title"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-900/95"
            ></div>
            <span
              class="absolute left-4 top-4 rounded-full bg-red-600/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg"
            >
              Tiêu điểm tuần này
            </span>
          </div>

          <div class="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
            <div>
              <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-amber-300">
                <span>{{ leadArticle.genre }}</span>
                <span class="text-slate-600">•</span>
                <span>{{ leadArticle.duration }}</span>
                <span class="text-slate-600">•</span>
                <span class="rounded bg-amber-400/15 px-2 py-0.5 text-amber-300">
                  ★ {{ leadArticle.rating }}/10
                </span>
              </div>

              <h2
                class="mt-3 text-xl font-black leading-snug text-white transition group-hover:text-amber-300 sm:text-2xl"
              >
                {{ leadArticle.headline }}
              </h2>

              <p class="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-300">
                {{ leadArticle.paragraphs[0] }}
              </p>
            </div>

            <div
              class="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs"
            >
              <span class="font-semibold text-slate-400">
                Khởi chiếu: {{ leadArticle.release }}
              </span>
              <span class="font-black text-amber-300 transition group-hover:translate-x-1">
                Đọc bài viết →
              </span>
            </div>
          </div>
        </a>
      }

      <!-- Remaining Review Cards Grid -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (article of articles; track article.slug) {
          <a
            [routerLink]="['/cinema-corner', article.slug]"
            class="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/75 shadow-xl transition hover:-translate-y-1 hover:border-amber-400/40"
          >
            <div class="relative aspect-[16/10] overflow-hidden bg-slate-950">
              <img
                [src]="article.backdropUrl"
                [alt]="article.title"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"
              ></div>
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span
                  class="rounded-md border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur"
                >
                  {{ article.genre }}
                </span>
                <span
                  class="rounded-md border border-amber-400/40 bg-slate-950/80 px-2 py-0.5 text-[11px] font-black text-amber-300 backdrop-blur"
                >
                  ★ {{ article.rating }}
                </span>
              </div>
            </div>

            <div class="flex flex-1 flex-col justify-between p-5">
              <div>
                <h3
                  class="line-clamp-2 text-base font-black leading-snug text-white transition group-hover:text-amber-300"
                >
                  {{ article.headline }}
                </h3>
                <p class="mt-2.5 line-clamp-3 text-xs leading-relaxed text-slate-400">
                  {{ article.paragraphs[0] }}
                </p>
              </div>

              <div
                class="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]"
              >
                <span class="font-medium text-slate-400">{{ article.director }}</span>
                <span class="font-bold text-amber-300 group-hover:underline">Đọc chi tiết →</span>
              </div>
            </div>
          </a>
        }
      </div>
    </div>
  `,
})
export class CinemaCornerListPageComponent {
  readonly articles = CINEMA_CORNER_ARTICLES;
  readonly leadArticle = CINEMA_CORNER_ARTICLES[0];
}
