import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore, ToastService } from '@cinehub/web/core';

@Component({
  selector: 'ch-portal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen bg-[#07090e] font-sans text-slate-100 selection:bg-amber-400 selection:text-black"
    >
      <!-- Toast Overlay -->
      <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        @for (t of toast.toasts(); track t.id) {
          <div
            class="pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl border animate-in fade-in slide-in-from-top-2 duration-200"
            [class]="
              t.tone === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                : t.tone === 'error'
                  ? 'bg-red-950/90 text-red-300 border-red-500/50'
                  : t.tone === 'warning'
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900/90 text-slate-200 border-white/20'
            "
          >
            <span class="text-sm">{{
              t.tone === 'success' ? '✓' : t.tone === 'error' ? '✕' : 'ℹ'
            }}</span>
            <span>{{ t.text }}</span>
          </div>
        }
      </div>

      <!-- Enterprise Backoffice Command Header -->
      <header
        class="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b0f19]/90 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div
          class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <!-- Left: Operations Brand & Cluster Status -->
          <div class="flex items-center gap-4">
            <a
              routerLink="/portal"
              class="flex items-center gap-2.5 transition hover:opacity-90"
              title="CineHub Operations Portal"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 font-mono text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20"
              >
                CH
              </span>
              <div>
                <span class="block text-sm font-black tracking-wider text-white">
                  CINEHUB <span class="text-amber-400">OPS</span>
                </span>
                <span class="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Operations Console
                </span>
              </div>
            </a>

            <!-- System Live Status Indicator -->
            <div
              class="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px] font-bold text-emerald-300 md:inline-flex"
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>LIVE CORE (Port 4000) · REDIS ONLINE</span>
            </div>
          </div>

          <!-- Center: Segmented Navigation (Staff vs Admin) -->
          <nav
            class="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-1"
            aria-label="Điều hướng Portal"
          >
            <a
              routerLink="/portal/staff"
              routerLinkActive="bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black"
              [routerLinkActiveOptions]="{ exact: true }"
              class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>🎟️</span>
              <span>Trạm Soát Vé Gate</span>
            </a>

            @if (isAdmin()) {
              <a
                routerLink="/portal/admin"
                routerLinkActive="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 font-black"
                [routerLinkActiveOptions]="{ exact: true }"
                class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span>📊</span>
                <span>Bảng Quản Trị Operations</span>
              </a>
            }
          </nav>

          <!-- Right: Clock, User Card & Actions -->
          <div class="flex items-center gap-3">
            <!-- Digital Shift Clock -->
            <div class="hidden font-mono text-xs font-bold text-slate-400 lg:block">
              <span class="text-slate-500">Ca trực:</span>
              <span
                class="ml-1.5 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-amber-300 tabular-nums"
              >
                {{ clock() }}
              </span>
            </div>

            <!-- User Badge -->
            <div
              class="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5"
            >
              <span
                class="grid h-7 w-7 place-items-center rounded-lg text-xs font-black"
                [class]="
                  userRole() === 'ADMIN'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-blue-400/20 text-blue-300'
                "
              >
                {{ userInitials() }}
              </span>
              <div class="hidden text-left sm:block">
                <span class="block max-w-[120px] truncate text-xs font-black text-white">
                  {{ userName() }}
                </span>
                <span
                  class="block text-[9px] font-black uppercase tracking-wider"
                  [class]="userRole() === 'ADMIN' ? 'text-amber-400' : 'text-blue-400'"
                >
                  {{ userRole() }}
                </span>
              </div>
            </div>

            <!-- Customer Portal Link -->
            <a
              href="http://localhost:4200"
              target="_blank"
              class="hidden rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white xl:inline-block"
              title="Mở Cổng khách hàng (localhost:4200) trong tab mới"
            >
              Cổng Khách ↗
            </a>

            <!-- Logout -->
            <button
              type="button"
              (click)="logout()"
              class="rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-300 transition hover:border-red-500 hover:bg-red-900/40 hover:text-white"
              title="Đăng xuất khỏi Cổng nội bộ"
            >
              Đăng xuất ⎋
            </button>
          </div>
        </div>
      </header>

      <!-- Main Portal Content -->
      <router-outlet />
    </div>
  `,
})
export class PortalLayoutComponent implements OnInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly clock = signal<string>('');
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly isAdmin = computed(() => this.authStore.user()?.role === 'ADMIN');
  readonly userName = computed(() => this.authStore.user()?.fullName || 'Nhân viên');
  readonly userRole = computed(() => this.authStore.user()?.role || 'STAFF');

  readonly userInitials = computed(() => {
    const name = this.userName();
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  });

  ngOnInit(): void {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.clock.set(
      now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }

  logout(): void {
    this.authStore.clearSession();
    this.toast.show('Đã đăng xuất khỏi Cổng điều hành nội bộ.', 'info');
    void this.router.navigateByUrl('/portal/login');
  }
}
