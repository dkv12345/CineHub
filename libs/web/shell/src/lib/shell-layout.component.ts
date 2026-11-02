import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthStore, ToastService } from '@cinehub/web/core';

@Component({
  selector: 'ch-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen flex flex-col transition-colors duration-300"
      [class]="
        themeMode() === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-stone-50 text-slate-900'
      "
    >
      <!-- Top Navigation Bar -->
      <header
        class="sticky top-0 z-40 border-b border-amber-500/20 bg-slate-950/90 backdrop-blur-xl"
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            routerLink="/"
            class="flex items-center gap-2.5 text-xl font-black tracking-tight text-white"
          >
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-600 text-slate-950 shadow-lg shadow-amber-500/20"
            >
              CH
            </span>
            <span>Cine<span class="text-amber-400">Hub</span></span>
          </a>

          <nav class="hidden md:flex items-center gap-1 text-sm font-medium">
            <a
              routerLink="/"
              routerLinkActive="bg-amber-500/15 text-amber-300 border-amber-400/40"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg border border-transparent px-3.5 py-2 text-slate-300 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Trang chủ' : 'Home' }}
            </a>
            <a
              routerLink="/showtimes"
              routerLinkActive="bg-amber-500/15 text-amber-300 border-amber-400/40"
              class="rounded-lg border border-transparent px-3.5 py-2 text-slate-300 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Lịch chiếu' : 'Showtimes' }}
            </a>
            <a
              routerLink="/concessions"
              routerLinkActive="bg-amber-500/15 text-amber-300 border-amber-400/40"
              class="rounded-lg border border-transparent px-3.5 py-2 text-slate-300 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Bắp & Nước' : 'Concessions' }}
            </a>
            <a
              routerLink="/my-tickets"
              routerLinkActive="bg-amber-500/15 text-amber-300 border-amber-400/40"
              class="rounded-lg border border-transparent px-3.5 py-2 text-slate-300 transition hover:text-white"
            >
              {{ activeLang() === 'vi' ? 'Vé của tôi' : 'My Tickets' }}
            </a>
          </nav>

          <div class="flex items-center gap-2.5">
            <!-- Brand selector pill -->
            <div
              class="hidden sm:flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-xs"
              role="group"
              aria-label="Cinema brand selector"
            >
              @for (b of brands; track b) {
                <button
                  type="button"
                  (click)="selectedBrand.set(b)"
                  class="rounded-md px-2.5 py-1 font-semibold transition"
                  [class]="
                    selectedBrand() === b
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  "
                >
                  {{ b }}
                </button>
              }
            </div>

            <!-- Language switcher (vi / en) -->
            <button
              type="button"
              (click)="toggleLanguage()"
              class="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-bold uppercase text-amber-300 hover:border-amber-500/40"
              aria-label="Switch language"
            >
              {{ activeLang() }}
            </button>

            <!-- Theme toggle -->
            <button
              type="button"
              (click)="toggleTheme()"
              class="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-amber-500/40"
              aria-label="Toggle theme"
            >
              {{ themeMode() === 'dark' ? '☾' : '☀' }}
            </button>

            @if (authStore.isAuthenticated()) {
              <a
                routerLink="/profile"
                class="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                <span>{{ authStore.displayName() }}</span>
              </a>
              <button
                type="button"
                (click)="logout()"
                class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                {{ activeLang() === 'vi' ? 'Thoát' : 'Sign Out' }}
              </button>
            } @else {
              <a
                routerLink="/auth"
                class="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm hover:from-amber-300 hover:to-amber-400"
              >
                {{ activeLang() === 'vi' ? 'Đăng nhập' : 'Sign In' }}
              </a>
            }
          </div>
        </div>
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
              class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md"
              [class]="
                toast.tone === 'error'
                  ? 'border-rose-500/50 bg-rose-950/90 text-rose-100'
                  : toast.tone === 'success'
                    ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100'
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

      <!-- Footer -->
      <footer class="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
        <div
          class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6"
        >
          <div>
            <span class="font-bold text-slate-200">CineHub Enterprise</span> · Angular 20 Zoneless +
            SignalStore + Three.js 3D Seat POV
          </div>
          <div class="flex gap-4">
            <a routerLink="/showtimes" class="hover:text-amber-300">Lịch chiếu</a>
            <a routerLink="/concessions" class="hover:text-amber-300">Bắp & Nước</a>
            <a routerLink="/my-tickets" class="hover:text-amber-300">Vé của tôi</a>
          </div>
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
