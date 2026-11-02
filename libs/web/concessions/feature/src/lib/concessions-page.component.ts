import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-concessions-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-black text-white sm:text-3xl">
            Bắp rang & Nước giải khát tại rạp
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            Đặt trước combo F&B để nhận ngay tại quầy ưu tiên Galaxy Cinema
          </p>
        </div>

        @if (store.totalCount() > 0) {
          <div
            class="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5"
          >
            <div class="text-xs">
              <div class="text-slate-300">
                Đã chọn <strong class="text-amber-300">{{ store.totalCount() }}</strong> phần
              </div>
              <div class="font-bold text-white">{{ formatPrice(store.totalAmount()) }}</div>
            </div>
            <a
              routerLink="/checkout"
              class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
            >
              Thanh toán ngay
            </a>
          </div>
        }
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (item of store.items(); track item.id) {
          <article
            class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-lg transition hover:border-amber-500/30"
          >
            <div>
              <div
                class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-xl text-amber-300"
              >
                🍿
              </div>
              <h2 class="mt-4 text-base font-bold text-white">{{ item.name }}</h2>
              <p class="mt-1.5 text-xs text-slate-400">{{ item.desc }}</p>
            </div>

            <div class="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
              <span class="text-sm font-extrabold text-amber-300">
                {{ formatPrice(item.price) }}
              </span>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="store.decrement(item.id)"
                  [attr.aria-label]="'Giảm ' + item.name"
                  class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-sm font-bold text-slate-200 hover:border-amber-400"
                >
                  −
                </button>
                <span class="w-6 text-center text-sm font-bold text-white">
                  {{ store.quantities()[item.id] ?? 0 }}
                </span>
                <button
                  type="button"
                  (click)="store.increment(item.id)"
                  [attr.aria-label]="'Tăng ' + item.name"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-slate-950 hover:bg-amber-400"
                >
                  +
                </button>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
})
export class ConcessionsPageComponent implements OnInit {
  readonly store = inject(ConcessionsStore);

  ngOnInit(): void {
    void this.store.loadFromApi();
  }

  formatPrice(amount: number): string {
    return fmt(amount);
  }
}
