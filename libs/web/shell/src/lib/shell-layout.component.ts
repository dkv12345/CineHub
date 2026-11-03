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
    <div class="cinema-app min-h-screen flex flex-col bg-[var(--color-background)]">
      <!-- Top Utility Bar: Cinema Chain Context & Hospitality Note -->
      <div
        class="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
      >
        <div
          class="cinema-container flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
        >
          <div class="flex items-center gap-3">
            <span class="cinema-eyebrow !text-[11px]">Hệ thống rạp đối tác</span>
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
                  class="rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold transition-colors"
                  [class]="
                    selectedBrand() === b
                      ? 'border-[var(--color-brand-primary)] bg-[#ffffff] text-[var(--color-brand-primary)] shadow-xs'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  "
                >
                  {{ b }}
                </button>
              }
            </div>
          </div>

          <div
            class="hidden sm:flex items-center gap-4 text-[11px] text-[var(--color-text-secondary)]"
          >
            <span>Đặt vé điện tử chính hãng</span>
            <span aria-hidden="true" class="text-[var(--color-border)]">|</span>
            <span>Giữ chỗ thời gian thực</span>
            <span aria-hidden="true" class="text-[var(--color-border)]">|</span>
            <span>Mô phỏng góc nhìn 3D POV</span>
          </div>
        </div>
      </div>

      <!-- Primary Editorial Header (Clean Warm Light Surface) -->
      <header
        class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/98 backdrop-blur-md"
      >
        <div class="cinema-container flex h-16 items-center justify-between gap-4">
          <div class="flex items-center gap-8">
            <a
              routerLink="/"
              class="group flex items-center gap-3 text-[var(--color-text-primary)] no-underline"
              aria-label="CineHub Trang chủ"
            >
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] font-display text-base font-bold text-[#fffdf9] shadow-xs transition-transform group-hover:scale-105"
              >
                CH
              </span>
              <span class="flex flex-col">
                <span
                  class="font-display text-2xl font-bold leading-none tracking-tight text-[var(--color-brand-primary)]"
                >
                  CineHub
                </span>
                <span
                  class="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]"
                >
                  {{ selectedBrand() }} Cinemas
                </span>
              </span>
            </a>

            <!-- Desktop Primary Navigation -->
            <nav class="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
              <a
                routerLink="/"
                routerLinkActive="!border-[var(--color-brand-primary)] !text-[var(--color-brand-primary)] !bg-[var(--color-brand-subtle)] font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                class="rounded-[4px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Phim đang chiếu' : 'Now Showing' }}
              </a>
              <a
                routerLink="/showtimes"
                routerLinkActive="!border-[var(--color-brand-primary)] !text-[var(--color-brand-primary)] !bg-[var(--color-brand-subtle)] font-semibold"
                class="rounded-[4px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Lịch chiếu & Rạp' : 'Showtimes & Venues' }}
              </a>
              <a
                routerLink="/concessions"
                routerLinkActive="!border-[var(--color-brand-primary)] !text-[var(--color-brand-primary)] !bg-[var(--color-brand-subtle)] font-semibold"
                class="rounded-[4px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Bắp & Quầy Bar' : 'Hospitality & Bar' }}
              </a>
              <a
                routerLink="/my-tickets"
                routerLinkActive="!border-[var(--color-brand-primary)] !text-[var(--color-brand-primary)] !bg-[var(--color-brand-subtle)] font-semibold"
                class="rounded-[4px] border border-transparent px-3.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Vé của tôi' : 'My Tickets' }}
              </a>
            </nav>
          </div>

          <!-- Right Actions: Language, Account, Mobile Menu -->
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              (click)="toggleLanguage()"
              class="inline-flex h-9 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
              aria-label="Chuyển đổi ngôn ngữ"
            >
              {{ activeLang() }}
            </button>

            @if (authStore.isAuthenticated()) {
              <a
                routerLink="/profile"
                class="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[var(--color-brand-primary)] bg-[var(--color-brand-subtle)] px-3 text-xs font-semibold text-[var(--color-brand-primary)] no-underline transition-colors hover:bg-[var(--color-brand-primary)] hover:text-[#fffdf9]"
              >
                <span>{{ authStore.displayName() }}</span>
              </a>
              <button
                type="button"
                (click)="logout()"
                class="inline-flex h-9 items-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
              >
                {{ activeLang() === 'vi' ? 'Thoát' : 'Sign Out' }}
              </button>
            } @else {
              <a
                routerLink="/auth"
                class="cinema-btn-primary !min-h-[36px] !px-3.5 !py-1.5 !text-xs font-bold"
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
              class="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] md:hidden"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
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
            class="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden"
            aria-label="Menu di động"
          >
            <div class="flex flex-col gap-1">
              <a
                routerLink="/"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[4px] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Phim đang chiếu' : 'Now Showing' }}
              </a>
              <a
                routerLink="/showtimes"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[4px] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Lịch chiếu & Rạp' : 'Showtimes & Venues' }}
              </a>
              <a
                routerLink="/concessions"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[4px] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-secondary)]"
              >
                {{ activeLang() === 'vi' ? 'Bắp & Quầy Bar' : 'Hospitality & Bar' }}
              </a>
              <a
                routerLink="/my-tickets"
                (click)="mobileMenuOpen.set(false)"
                class="rounded-[4px] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-secondary)]"
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
              class="flex items-center justify-between gap-3 rounded-[4px] border px-4 py-3 text-xs font-semibold shadow-md"
              [class]="
                toast.tone === 'error'
                  ? 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
                  : toast.tone === 'success'
                    ? 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    : 'border-[var(--color-brand-primary)] bg-[var(--color-surface)] text-[var(--color-brand-primary)]'
              "
            >
              <span>{{ toast.text }}</span>
              <button
                type="button"
                (click)="toastService.dismiss(toast.id)"
                class="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Đóng thông báo"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
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

      <!-- Deferred Concierge Chat Widget -->
      @defer (on idle) {
        <ch-chatbot-widget />
      }

      <!-- Editorial Hospitality Footer (Warm Sand / Ivory) -->
      <footer
        class="mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-12 text-xs text-[var(--color-text-secondary)]"
      >
        <div class="cinema-container grid gap-8 md:grid-cols-12">
          <div class="md:col-span-5 space-y-3">
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-[3px] bg-[var(--color-brand-primary)] font-display text-xs font-bold text-[#fffdf9]"
              >
                CH
              </span>
              <span class="font-display text-lg font-bold text-[var(--color-text-primary)]">
                CineHub Screening Rooms
              </span>
            </div>
            <p class="max-w-sm leading-relaxed text-[var(--color-text-secondary)]">
              Nền tảng đặt vé điện ảnh trực tuyến, cung cấp lịch chiếu toàn quốc, góc nhìn phòng
              chiếu 3D POV và dịch vụ ẩm thực tại rạp được thiết kế theo chuẩn hiếu khách hiện đại.
            </p>
          </div>

          <div class="md:col-span-4 space-y-2">
            <div class="cinema-eyebrow">Trải nghiệm & Suất chiếu</div>
            <ul class="mt-2 space-y-2 list-none p-0">
              <li>
                <a
                  routerLink="/"
                  class="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-brand-primary)]"
                >
                  Danh mục phim đang chiếu & sắp chiếu
                </a>
              </li>
              <li>
                <a
                  routerLink="/showtimes"
                  class="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-brand-primary)]"
                >
                  Lịch chiếu theo cụm rạp & định dạng IMAX / 3D
                </a>
              </li>
              <li>
                <a
                  routerLink="/concessions"
                  class="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-brand-primary)]"
                >
                  Thực đơn Bắp & Quầy Bar ưu tiên
                </a>
              </li>
            </ul>
          </div>

          <div class="md:col-span-3 space-y-2">
            <div class="cinema-eyebrow">Tài khoản & Hỗ trợ</div>
            <ul class="mt-2 space-y-2 list-none p-0">
              <li>
                <a
                  routerLink="/my-tickets"
                  class="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-brand-primary)]"
                >
                  Tra cứu vé điện tử & mã QR
                </a>
              </li>
              <li>
                <a
                  routerLink="/auth"
                  class="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-brand-primary)]"
                >
                  Đăng nhập / Đăng ký thành viên CineHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="cinema-container mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-[11px] text-[var(--color-text-muted)] sm:flex-row"
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
  readonly activeLang = signal<'vi' | 'en'>('vi');
  readonly mobileMenuOpen = signal(false);

  toggleLanguage(): void {
    const next = this.activeLang() === 'vi' ? 'en' : 'vi';
    this.activeLang.set(next);
    this.transloco.setActiveLang(next);
  }

  logout(): void {
    this.authStore.clearSession();
    this.toastService.show('Đã đăng xuất tài khoản.', 'info');
    void this.router.navigateByUrl('/');
  }
}
