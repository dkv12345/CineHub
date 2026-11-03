import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { ChatbotWidgetComponent } from '@cinehub/web/assistant/feature';
import { AuthStore, ToastService } from '@cinehub/web/core';

@Component({
  selector: 'ch-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cinema-app min-h-screen flex flex-col"
      [class.cinema-theme-light]="themeMode() === 'light'"
    >
      <!-- Top Utility Bar: Cinema Chain Context & Hospitality Note -->
      <div class="border-b border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface-inset)]">
        <div
          class="cinema-container flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-[var(--cinema-text-secondary)]"
        >
          <div class="flex items-center gap-3">
            <span class="cinema-eyebrow">Hệ thống rạp</span>
            <div
              class="inline-flex items-center gap-1"
              role="group"
              aria-label="Chọn cụm rạp chiếu"
            >
              @for (b of brands; track b) {
                <button
                  type="button"
                  (click)="selectedBrand.set(b)"
                  [attr.aria-pressed]="selectedBrand() === b"
                  class="rounded-[2px] border px-2 py-0.5 text-[11px] font-medium transition-colors"
                  [class]="
                    selectedBrand() === b
                      ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)]'
                      : 'border-transparent text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
                  "
                >
                  {{ b }}
                </button>
              }
            </div>
          </div>

          <div
            class="hidden sm:flex items-center gap-4 text-[11px] text-[var(--cinema-text-muted)]"
          >
            <span>Đặt vé trực tuyến · Giữ ghế thời gian thực</span>
            <span aria-hidden="true">|</span>
            <span>Góc nhìn phòng chiếu 3D POV</span>
          </div>
        </div>
      </div>

      <!-- Primary Editorial Header -->
      <header
        class="sticky top-0 z-40 border-b border-[var(--cinema-border)] bg-[var(--cinema-canvas)]/95"
      >
        <div class="cinema-container flex h-16 items-center justify-between gap-4">
          <div class="flex items-center gap-8">
            <a
              routerLink="/"
              class="group flex items-center gap-3 text-[var(--cinema-text-primary)] no-underline"
              aria-label="CineHub Trang chủ"
            >
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] font-display text-base font-semibold tracking-wider text-[var(--cinema-text-primary)]"
              >
                CH
              </span>
              <span class="flex flex-col">
                <span class="font-display text-xl font-semibold leading-none tracking-tight">
                  CineHub
                </span>
                <span
                  class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--cinema-accent)]"
                >
                  {{ selectedBrand() }} Screening Rooms
                </span>
              </span>
            </a>

            <!-- Desktop Primary Navigation -->
            <nav class="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
              <a
                routerLink="/"
                routerLinkActive="border-[var(--cinema-accent)] text-[var(--cinema-text-primary)] bg-[var(--cinema-surface)]"
                [routerLinkActiveOptions]="{ exact: true }"
                class="rounded-[3px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--cinema-text-secondary)] no-underline transition-colors hover:text-[var(--cinema-text-primary)]"
              >
                {{ activeLang() === 'vi' ? 'Phim đang chiếu' : 'Now Showing' }}
              </a>
              <a
                routerLink="/showtimes"
                routerLinkActive="border-[var(--cinema-accent)] text-[var(--cinema-text-primary)] bg-[var(--cinema-surface)]"
                class="rounded-[3px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--cinema-text-secondary)] no-underline transition-colors hover:text-[var(--cinema-text-primary)]"
              >
                {{ activeLang() === 'vi' ? 'Lịch chiếu & Rạp' : 'Showtimes & Venues' }}
              </a>
              <a
                routerLink="/concessions"
                routerLinkActive="border-[var(--cinema-accent)] text-[var(--cinema-text-primary)] bg-[var(--cinema-surface)]"
                class="rounded-[3px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--cinema-text-secondary)] no-underline transition-colors hover:text-[var(--cinema-text-primary)]"
              >
                {{ activeLang() === 'vi' ? 'Bắp & Nước' : 'Hospitality & Bar' }}
              </a>
              <a
                routerLink="/my-tickets"
                routerLinkActive="border-[var(--cinema-accent)] text-[var(--cinema-text-primary)] bg-[var(--cinema-surface)]"
                class="rounded-[3px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--cinema-text-secondary)] no-underline transition-colors hover:text-[var(--cinema-text-primary)]"
              >
                {{ activeLang() === 'vi' ? 'Vé của tôi' : 'My Tickets' }}
              </a>
            </nav>
          </div>

          <!-- Right Actions: Language, Theme, Account, Mobile Menu -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="toggleLanguage()"
              class="inline-flex h-9 items-center justify-center rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] px-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--cinema-text-secondary)] transition-colors hover:border-[var(--cinema-accent)] hover:text-[var(--cinema-text-primary)]"
              aria-label="Chuyển đổi ngôn ngữ"
            >
              {{ activeLang() }}
            </button>

            <button
              type="button"
              (click)="toggleTheme()"
              class="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-secondary)] transition-colors hover:border-[var(--cinema-accent)] hover:text-[var(--cinema-text-primary)]"
              aria-label="Chuyển chế độ sáng tối"
            >
              @if (themeMode() === 'dark') {
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                  />
                </svg>
              } @else {
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                  />
                </svg>
              }
            </button>

            @if (authStore.isAuthenticated()) {
              <a
                routerLink="/profile"
                class="inline-flex h-9 items-center gap-2 rounded-[3px] border border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] px-3 text-xs font-semibold text-[var(--cinema-text-primary)] no-underline transition-colors hover:bg-[var(--cinema-accent)] hover:text-[#171512]"
              >
                <span>{{ authStore.displayName() }}</span>
              </a>
              <button
                type="button"
                (click)="logout()"
                class="inline-flex h-9 items-center rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] px-2.5 text-xs font-medium text-[var(--cinema-text-secondary)] transition-colors hover:border-[var(--cinema-danger)] hover:text-[var(--cinema-danger)]"
              >
                {{ activeLang() === 'vi' ? 'Thoát' : 'Sign Out' }}
              </button>
            } @else {
              <a
                routerLink="/auth"
                class="cinema-btn-primary !min-h-[36px] !px-3.5 !py-1.5 !text-xs"
              >
                {{ activeLang() === 'vi' ? 'Đăng nhập' : 'Sign In' }}
              </a>
            }

            <!-- Mobile Navigation Toggle -->
            <button
              type="button"
              (click)="mobileMenuOpen.set(!mobileMenuOpen())"
              [attr.aria-expanded]="mobileMenuOpen()"
              aria-label="Mở menu điều hướng"
              class="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-primary)] md:hidden"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                @if (mobileMenuOpen()) {
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                } @else {
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                }
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Collapsible Navigation -->
        @if (mobileMenuOpen()) {
          <nav
            class="border-t border-[var(--cinema-border)] bg-[var(--cinema-surface)] px-4 py-3 md:hidden"
            aria-label="Menu di động"
          >
            <div class="flex flex-col gap-1">
              <a
                routerLink="/"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[3px] px-3 py-2 text-sm font-medium text-[var(--cinema-text-primary)] no-underline hover:bg-[var(--cinema-surface-raised)]"
              >
                {{ activeLang() === 'vi' ? 'Phim đang chiếu' : 'Now Showing' }}
              </a>
              <a
                routerLink="/showtimes"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[3px] px-3 py-2 text-sm font-medium text-[var(--cinema-text-primary)] no-underline hover:bg-[var(--cinema-surface-raised)]"
              >
                {{ activeLang() === 'vi' ? 'Lịch chiếu & Rạp' : 'Showtimes & Venues' }}
              </a>
              <a
                routerLink="/concessions"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[3px] px-3 py-2 text-sm font-medium text-[var(--cinema-text-primary)] no-underline hover:bg-[var(--cinema-surface-raised)]"
              >
                {{ activeLang() === 'vi' ? 'Bắp & Nước' : 'Hospitality & Bar' }}
              </a>
              <a
                routerLink="/my-tickets"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[3px] px-3 py-2 text-sm font-medium text-[var(--cinema-text-primary)] no-underline hover:bg-[var(--cinema-surface-raised)]"
              >
                {{ activeLang() === 'vi' ? 'Vé của tôi' : 'My Tickets' }}
              </a>
            </div>
          </nav>
        }
      </header>

      <!-- Global Toast Container -->
      @if (toastService.toasts().length > 0) {
        <div
          class="fixed right-5 bottom-20 z-50 flex max-w-sm flex-col gap-2"
          role="status"
          aria-live="polite"
        >
          @for (toast of toastService.toasts(); track toast.id) {
            <div
              class="flex items-center justify-between gap-3 rounded-[4px] border px-4 py-3 text-xs font-medium shadow-lg"
              [class]="
                toast.tone === 'error'
                  ? 'border-[var(--cinema-danger)] bg-[var(--cinema-danger-bg)] text-[var(--cinema-text-primary)]'
                  : toast.tone === 'success'
                    ? 'border-[var(--cinema-success)] bg-[var(--cinema-success-bg)] text-[var(--cinema-text-primary)]'
                    : 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)]'
              "
            >
              <span>{{ toast.text }}</span>
              <button
                type="button"
                (click)="toastService.dismiss(toast.id)"
                class="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-[var(--cinema-text-secondary)] hover:text-[var(--cinema-text-primary)]"
                aria-label="Đóng thông báo"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          }
        </div>
      }

      <!-- Main Route Outlet -->
      <main class="flex-1">
        <router-outlet />
      </main>

      <!-- Deferred AI Assistant Widget -->
      @defer (on idle) {
        <ch-chatbot-widget />
      }

      <!-- Editorial Footer -->
      <footer
        class="mt-16 border-t border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] py-12 text-xs text-[var(--cinema-text-secondary)]"
      >
        <div class="cinema-container grid gap-8 md:grid-cols-12">
          <div class="md:col-span-5 space-y-2.5">
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-[var(--cinema-accent)] bg-[var(--cinema-surface)] font-display text-xs font-semibold text-[var(--cinema-text-primary)]"
              >
                CH
              </span>
              <span class="font-display text-base font-semibold text-[var(--cinema-text-primary)]">
                CineHub Screening Rooms
              </span>
            </div>
            <p class="max-w-sm leading-relaxed text-[var(--cinema-text-muted)]">
              Nền tảng đặt vé điện ảnh trực tuyến, tra cứu lịch chiếu toàn quốc và mô phỏng góc nhìn
              phòng chiếu 3D POV theo thời gian thực.
            </p>
          </div>

          <div class="md:col-span-4 space-y-2">
            <div class="cinema-eyebrow">Trải nghiệm & Đặt vé</div>
            <ul class="mt-2 space-y-1.5 list-none p-0">
              <li>
                <a
                  routerLink="/"
                  class="text-[var(--cinema-text-secondary)] no-underline hover:text-[var(--cinema-text-primary)]"
                >
                  Danh mục phim đang chiếu & sắp chiếu
                </a>
              </li>
              <li>
                <a
                  routerLink="/showtimes"
                  class="text-[var(--cinema-text-secondary)] no-underline hover:text-[var(--cinema-text-primary)]"
                >
                  Lịch chiếu theo cụm rạp & định dạng IMAX / 3D
                </a>
              </li>
              <li>
                <a
                  routerLink="/concessions"
                  class="text-[var(--cinema-text-secondary)] no-underline hover:text-[var(--cinema-text-primary)]"
                >
                  Thực đơn Bắp & Nước tại quầy ưu tiên
                </a>
              </li>
            </ul>
          </div>

          <div class="md:col-span-3 space-y-2">
            <div class="cinema-eyebrow">Tài khoản thành viên</div>
            <ul class="mt-2 space-y-1.5 list-none p-0">
              <li>
                <a
                  routerLink="/my-tickets"
                  class="text-[var(--cinema-text-secondary)] no-underline hover:text-[var(--cinema-text-primary)]"
                >
                  Tra cứu vé điện tử & mã QR
                </a>
              </li>
              <li>
                <a
                  routerLink="/auth"
                  class="text-[var(--cinema-text-secondary)] no-underline hover:text-[var(--cinema-text-primary)]"
                >
                  Đăng nhập / Đăng ký thành viên
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="cinema-container mt-8 flex flex-col items-center justify-between gap-3 border-t border-[var(--cinema-border-subtle)] pt-6 text-[11px] text-[var(--cinema-text-muted)] sm:flex-row"
        >
          <span>© 2026 CineHub. Bảo lưu mọi quyền.</span>
          <span
            >Chuẩn phân loại độ tuổi phim theo quy định Cục Điện ảnh (P, K, T13, T16, T18).</span
          >
        </div>
      </footer>
    </div>
  `,
})
export class ShellLayoutComponent {
  readonly authStore = inject(AuthStore);
  readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  readonly brands = ['Galaxy', 'CGV', 'Lotte', 'BHD'] as const;
  readonly selectedBrand = signal<(typeof this.brands)[number]>('Galaxy');
  readonly themeMode = signal<'dark' | 'light'>('dark');
  readonly activeLang = signal<'vi' | 'en'>('vi');
  readonly mobileMenuOpen = signal(false);

  toggleLanguage(): void {
    const next = this.activeLang() === 'vi' ? 'en' : 'vi';
    this.activeLang.set(next);
    this.transloco.setActiveLang(next);
  }

  toggleTheme(): void {
    this.themeMode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  logout(): void {
    this.authStore.clearSession();
    this.toastService.show('Đã đăng xuất tài khoản.', 'info');
    void this.router.navigateByUrl('/');
  }
}
