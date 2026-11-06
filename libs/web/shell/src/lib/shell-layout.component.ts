import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { ChatbotWidgetComponent } from '@cinehub/web/assistant/feature';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';

@Component({
  selector: 'ch-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen flex flex-col bg-[#020617] text-white selection:bg-amber-400 selection:text-black"
    >
      <!-- Top Navigation Bar -->
      <header
        class="sticky top-0 z-50 border-b border-white/15 bg-[rgba(15,23,42,0.85)] shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-[20px] backdrop-saturate-150"
      >
        <div class="mx-auto flex h-[74px] max-w-[1440px] items-center gap-4 px-5 md:gap-6 md:px-9">
          <!-- Mobile Menu Button -->
          <button
            type="button"
            (click)="mobileMenuOpen.set(!mobileMenuOpen())"
            aria-label="Menu"
            class="rounded-full p-2 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              @if (mobileMenuOpen()) {
                <path d="M18 6L6 18M6 6l12 12" />
              } @else {
                <path d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          <!-- Red CINEHUB Brand Logo -->
          <a
            routerLink="/"
            class="flex shrink-0 items-center gap-2.5 transition hover:opacity-95"
            aria-label="CineHub trang chủ"
          >
            <span
              class="grid h-9 w-9 place-items-center rounded-full bg-[#e50914] text-white shadow-[0_0_25px_rgba(229,9,20,0.35)]"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </span>
            <span class="text-[22px] font-extrabold tracking-[-.04em] text-white">
              CINE<span class="text-[#e50914]">HUB</span>
            </span>
          </a>

          <!-- Main Desktop Nav -->
          <nav class="ml-4 hidden items-center gap-7 text-sm font-bold lg:flex">
            <a
              routerLink="/"
              routerLinkActive="!text-amber-300"
              [routerLinkActiveOptions]="{ exact: true }"
              class="text-white/75 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Phim' : 'Movies' }}
            </a>
            <a
              routerLink="/showtimes"
              routerLinkActive="!text-amber-300"
              class="text-white/75 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Lịch chiếu' : 'Showtimes' }}
            </a>
            <a
              routerLink="/concessions"
              routerLinkActive="!text-amber-300"
              class="text-white/75 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Bắp & Nước' : 'Concessions' }}
            </a>
            <a
              routerLink="/my-tickets"
              routerLinkActive="!text-amber-300"
              class="text-white/75 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Vé của tôi' : 'My Tickets' }}
            </a>
          </nav>

          <!-- Search Bar with Live Results Dropdown -->
          <div class="relative ml-auto hidden max-w-[340px] flex-1 sm:block">
            <div
              class="glass-control flex items-center gap-3 rounded-full px-4 py-2 text-white/70 focus-within:border-amber-400/50"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                aria-label="Tìm kiếm phim"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                (focus)="searchFocus.set(true)"
                (blur)="onSearchBlur()"
                class="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/40"
                placeholder="Tìm phim, đạo diễn, diễn viên..."
              />
            </div>

            @if (searchFocus() && searchResults().length > 0) {
              <div
                class="glass-panel absolute inset-x-0 top-[48px] z-50 max-h-80 overflow-y-auto rounded-2xl p-2 shadow-2xl"
              >
                @for (m of searchResults(); track m.id) {
                  <a
                    [routerLink]="['/movie', m.id]"
                    (mousedown)="selectSearchResult()"
                    class="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/10"
                  >
                    <img
                      [src]="m.poster"
                      [alt]="m.title"
                      class="h-12 w-8.5 rounded-lg object-cover ring-1 ring-white/20"
                    />
                    <div class="min-w-0">
                      <b
                        class="block truncate text-xs font-black text-white hover:text-amber-300"
                        >{{ m.title }}</b
                      >
                      <small class="block truncate text-[11px] font-bold text-amber-300">{{
                        m.genre
                      }}</small>
                    </div>
                  </a>
                }
              </div>
            }
          </div>

          <!-- User Session / Sign In Actions -->
          <div class="flex items-center gap-3">
            @if (authStore.isAuthenticated()) {
              <div class="relative">
                <button
                  type="button"
                  (click)="userDropdownOpen.set(!userDropdownOpen())"
                  aria-label="Tài khoản"
                  class="flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/80 p-1 pr-3 text-xs font-bold text-white transition hover:border-amber-400"
                >
                  <span
                    class="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 font-black"
                  >
                    {{ authStore.displayName().slice(0, 1).toUpperCase() }}
                  </span>
                  <span class="max-w-[120px] truncate hidden sm:inline">{{
                    authStore.displayName()
                  }}</span>
                </button>

                @if (userDropdownOpen()) {
                  <div
                    class="glass-panel absolute right-0 top-12 z-50 w-56 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl"
                    (click)="userDropdownOpen.set(false)"
                  >
                    <div class="border-b border-white/10 px-3.5 py-2.5">
                      <b class="block truncate text-xs font-black text-white">{{
                        authStore.displayName()
                      }}</b>
                      <small class="block truncate text-[10px] text-white/50">{{
                        authStore.user()?.email
                      }}</small>
                    </div>
                    <a
                      routerLink="/profile"
                      class="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Hồ sơ của tôi
                    </a>
                    <a
                      routerLink="/my-tickets"
                      class="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Vé của tôi
                    </a>
                    <button
                      type="button"
                      (click)="logout()"
                      class="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15"
                    >
                      Đăng xuất
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div class="flex items-center gap-2">
                <a
                  [routerLink]="['/auth']"
                  [queryParams]="{ mode: 'register' }"
                  class="hidden rounded-xl px-4 py-2 text-xs font-black text-white/80 transition hover:text-white md:block"
                >
                  {{ activeLang() === 'vi' ? 'Đăng ký' : 'Sign Up' }}
                </a>
                <a
                  [routerLink]="['/auth']"
                  [queryParams]="{ mode: 'login' }"
                  class="rounded-xl bg-[#e50914] px-4.5 py-2 text-xs font-black text-white shadow-lg shadow-red-900/40 transition hover:bg-[#ff101c]"
                >
                  {{ activeLang() === 'vi' ? 'Đăng nhập' : 'Sign In' }}
                </a>
              </div>
            }

            <!-- AI Chatbot Header Trigger Button -->
            <button
              type="button"
              (click)="triggerChatbot()"
              aria-label="Hỏi CineBot AI"
              title="Hỏi CineBot AI"
              class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-amber-300 transition hover:border-amber-400 hover:bg-amber-400/20"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Navigation Menu -->
        @if (mobileMenuOpen()) {
          <nav
            class="border-t border-white/10 bg-[rgba(10,13,20,0.95)] px-5 py-4 backdrop-blur-2xl lg:hidden"
            (click)="mobileMenuOpen.set(false)"
          >
            <div class="flex flex-col gap-3 text-sm font-bold">
              <a routerLink="/" class="py-1.5 text-white/80 hover:text-amber-300">Phim</a>
              <a routerLink="/showtimes" class="py-1.5 text-white/80 hover:text-amber-300"
                >Lịch chiếu</a
              >
              <a routerLink="/concessions" class="py-1.5 text-white/80 hover:text-amber-300"
                >Bắp & Nước</a
              >
              <a routerLink="/my-tickets" class="py-1.5 text-white/80 hover:text-amber-300"
                >Vé của tôi</a
              >
            </div>
          </nav>
        }
      </header>

      <!-- Global Toast Container -->
      @if (toastService.toasts().length > 0) {
        <div
          class="fixed right-4 bottom-20 z-50 flex flex-col gap-2 max-w-sm"
          role="status"
          aria-live="polite"
        >
          @for (toast of toastService.toasts(); track toast.id) {
            <div
              class="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl"
              [class]="
                toast.tone === 'error'
                  ? 'border-rose-500/50 bg-rose-950/95 text-rose-100'
                  : toast.tone === 'success'
                    ? 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100'
                    : 'border-amber-500/50 bg-slate-900/95 text-amber-100'
              "
            >
              <span>{{ toast.text }}</span>
              <button
                type="button"
                (click)="toastService.dismiss(toast.id)"
                class="text-xs opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          }
        </div>
      }

      <!-- Main Route Outlet -->
      <main class="flex-1">
        <router-outlet />
      </main>

      <!-- Deferred AI Assistant Widget (Maintained unchanged) -->
      @defer (on idle) {
        <ch-chatbot-widget />
      }

      <!-- Luxury 4-Column Footer -->
      <footer class="mt-14 border-t border-white/15 bg-[rgba(8,10,14,0.7)] backdrop-blur-2xl">
        <div
          class="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-9"
        >
          <div>
            <b class="text-xl font-extrabold text-white">
              CINE<span class="text-[#e50914]">HUB</span>
            </b>
            <p className="mt-3 max-w-[280px] text-xs leading-6 text-white/45">
              Nền tảng tra cứu lịch chiếu, chọn ghế trực tiếp, đặt vé xem phim và combo bắp nước
              trực tuyến trên toàn quốc.
            </p>
          </div>

          <div>
            <h3 class="text-xs font-black uppercase tracking-wider text-amber-300">Khám phá</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-semibold text-white/50">
              <li><a routerLink="/" class="hover:text-white">Phim đang chiếu</a></li>
              <li><a routerLink="/" class="hover:text-white">Phim sắp chiếu</a></li>
              <li><a routerLink="/showtimes" class="hover:text-white">Lịch chiếu toàn quốc</a></li>
              <li><a routerLink="/concessions" class="hover:text-white">Combo bắp & nước</a></li>
            </ul>
          </div>

          <div>
            <h3 class="text-xs font-black uppercase tracking-wider text-amber-300">Hỗ trợ</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-semibold text-white/50">
              <li><a routerLink="/" class="hover:text-white">Trung tâm trợ giúp</a></li>
              <li><a routerLink="/" class="hover:text-white">Chính sách hoàn vé</a></li>
              <li><a routerLink="/" class="hover:text-white">Liên hệ chăm sóc khách hàng</a></li>
              <li><a routerLink="/" class="hover:text-white">Câu hỏi thường gặp (FAQ)</a></li>
            </ul>
          </div>

          <div>
            <h3 class="text-xs font-black uppercase tracking-wider text-amber-300">Về CineHub</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-semibold text-white/50">
              <li><a routerLink="/" class="hover:text-white">Giới thiệu nền tảng</a></li>
              <li><a routerLink="/" class="hover:text-white">Điều khoản sử dụng</a></li>
              <li><a routerLink="/" class="hover:text-white">Chính sách bảo mật</a></li>
              <li><a routerLink="/" class="hover:text-white">Tuyển dụng & Hợp tác</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-white/10 py-5 text-center text-[11px] text-white/35">
          © 2026 CineHub Cinema Experience Platform. All rights reserved.
        </div>
      </footer>
    </div>
  `,
})
export class ShellLayoutComponent {
  readonly authStore = inject(AuthStore);
  readonly toastService = inject(ToastService);
  private readonly catalogStore = inject(CatalogStore);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  readonly activeLang = signal<'vi' | 'en'>('vi');
  readonly mobileMenuOpen = signal(false);
  readonly userDropdownOpen = signal(false);
  readonly searchFocus = signal(false);
  readonly searchQuery = signal('');

  readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.catalogStore
      .movies()
      .filter((m) => m.title.toLowerCase().includes(q) || m.cast.toLowerCase().includes(q))
      .slice(0, 5);
  });

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onSearchBlur(): void {
    setTimeout(() => this.searchFocus.set(false), 180);
  }

  selectSearchResult(): void {
    this.searchQuery.set('');
    this.searchFocus.set(false);
  }

  triggerChatbot(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cinehub:open-chat'));
    }
  }

  logout(): void {
    this.authStore.clearSession();
    this.toastService.show('Đã đăng xuất tài khoản.', 'info');
    void this.router.navigateByUrl('/');
  }
}
