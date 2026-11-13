import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingStore, type ShowtimeMetadata } from '@cinehub/web/booking/data-access';
import { BookingSummaryCardComponent } from '@cinehub/web/booking/ui';
import { ToastService } from '@cinehub/web/core';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import type { GalaxySession } from '@cinehub/web/showtimes/util';
import {
  generateAuditoriumSeats,
  layoutForCinema,
  SeatMap3DComponent,
  SeatPOVSceneComponent,
  type SeatCell,
} from '@cinehub/web/seat-3d';

@Component({
  selector: 'ch-seats-page',
  standalone: true,
  imports: [SeatMap3DComponent, SeatPOVSceneComponent, BookingSummaryCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <div class="fixed inset-0 z-0 overflow-hidden bg-[#020617]">
        @if (store.movieBackdropUrl()) {
          <img
            [src]="store.movieBackdropUrl()"
            [alt]="''"
            class="h-full w-full scale-105 object-cover object-center opacity-90 blur-[0.5px]"
          />
        }
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/70 to-[#020617]"
        ></div>
      </div>
      <div class="relative z-10 mx-auto max-w-[1440px] px-5 py-6 md:px-9">
        <!-- Nút quay lại & Tiến trình thanh toán 3 Bước -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            (click)="goBack()"
            aria-label="Quay lại lịch chiếu"
            class="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125 text-amber-300"
          >
            ← Quay lại lịch chiếu
          </button>

          <!-- 3-Step Progress Indicator -->
          <nav aria-label="Tiến trình đặt vé" class="flex items-center gap-2 text-xs font-black">
            <div
              class="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-400/20 px-3.5 py-1.5 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black"
                >1</span
              >
              <span>Chọn ghế</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-white/20"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >2</span
              >
              <span>Bắp nước</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-white/20"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >3</span
              >
              <span>Thanh toán</span>
            </div>
          </nav>
        </div>

        <!-- Header Info -->
        <div class="mb-6">
          <h1 class="text-2xl font-black text-white sm:text-3xl">
            Chọn ghế ngồi & Góc nhìn 3D POV
          </h1>
          <p class="mt-1 text-xs font-bold text-slate-400">
            {{ store.movieTitle() }} · {{ store.cinemaName() }} · Suất {{ store.showTime() }} ({{
              store.format()
            }})
          </p>
        </div>

        <div
          class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <!-- 3D Seat Map Column -->
          <div class="min-w-0 p-1 sm:p-2">
            <ch-seat-map-3d
              [layout]="auditoriumLayout()"
              [seats]="seats()"
              (seatChosen)="onSeatChosen($event)"
            />
          </div>

          <!-- Right Sidebar: 3D POV Scene + Summary Card -->
          <div class="space-y-5">
            <div
              class="overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900/90 shadow-2xl"
            >
              <ch-seat-pov-scene [layout]="auditoriumLayout()" [activeSeat]="lastActiveSeat()" />
            </div>

            <ch-booking-summary-card
              [movieTitle]="store.movieTitle()"
              [cinemaName]="store.cinemaName()"
              [showTime]="store.showTime()"
              [format]="store.format()"
              [seatLabels]="selectedSeatLabels()"
              [holdFormatted]="store.holdFormatted()"
              [totalAmount]="store.seatsSubtotal()"
            />

            <!-- Proceed to Step 2: Concessions -->
            <button
              type="button"
              (click)="proceedToConcessions()"
              [disabled]="store.selectedSeats().length === 0"
              aria-label="Tiếp tục chọn bắp nước"
              class="w-full rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
              [class.opacity-50]="store.selectedSeats().length === 0"
            >
              Tiếp tục chọn bắp nước ({{ store.selectedSeats().length }} ghế) →
            </button>
          </div>
        </div>
      </div>

      @if (pendingUnselectSeat(); as seat) {
        <div
          class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unselect-seat-title"
            class="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-6 text-center shadow-2xl"
          >
            <h2 id="unselect-seat-title" class="text-lg font-black text-white">
              Bỏ chọn ghế {{ seat.id }}?
            </h2>
            <p class="mt-2 text-sm text-slate-300">Ghế này sẽ được xóa khỏi đơn vé của bạn.</p>
            <div class="mt-5 flex justify-center gap-3">
              <button
                type="button"
                (click)="pendingUnselectSeat.set(null)"
                class="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Giữ ghế
              </button>
              <button
                type="button"
                (click)="confirmUnselectSeat(seat)"
                class="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300"
              >
                Bỏ chọn
              </button>
            </div>
          </section>
        </div>
      }
    </main>
  `,
})
export class SeatsPageComponent implements OnInit, OnDestroy {
  readonly store = inject(BookingStore);
  private readonly toast = inject(ToastService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly showtimesStore = inject(ShowtimesStore);
  private readonly http = inject(HttpClient);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;

  readonly showtimeId = input<string>('');
  readonly lastActiveSeat = signal<SeatCell | null>(null);
  readonly pendingUnselectSeat = signal<SeatCell | null>(null);
  readonly backendSeats = signal<any[]>([]);
  readonly expiresAt = signal<string | null>(null);

  readonly auditoriumLayout = computed(() => layoutForCinema(this.store.cinemaName()));

  readonly seats = computed(() => {
    const base = generateAuditoriumSeats(
      this.auditoriumLayout(),
      this.store.selectedSeatIds(),
      this.store.showtimeId(),
    );
    const backend = this.backendSeats();
    if (!backend || backend.length === 0) return base;

    const backendMap = new Map<string, any>();
    for (const b of backend) {
      if (b.label) backendMap.set(b.label, b);
      if (b.seatId) backendMap.set(b.seatId, b);
    }

    return base.map((cell) => {
      const bs = backendMap.get(cell.id);
      if (!bs) return cell;
      const isHeldByOther = bs.status === 'HELD' && !bs.isHeldByMe;
      const isSold = bs.status === 'SOLD' || bs.status === 'BLOCKED' || bs.status === 'BOOKED';

      return {
        ...cell,
        sold: isSold,
        heldByOther: isHeldByOther,
        selected: this.store.selectedSeatIds().has(cell.id),
      };
    });
  });

  readonly selectedSeatLabels = computed(() => this.store.selectedSeats().map((s) => s.id));

  ngOnInit(): void {
    const showtimeId = this.showtimeId() || this.route.snapshot.paramMap.get('showtimeId') || '';
    if (!showtimeId) return;

    const params = this.route.snapshot.queryParamMap;
    const metadata: ShowtimeMetadata = {
      movieTitle: params.get('movieTitle') || undefined,
      movieId: params.get('movieId') || undefined,
      cinemaName: params.get('cinemaName') || undefined,
      cinemaId: params.get('cinemaId') || undefined,
      cinemaCode: params.get('cinemaCode') || undefined,
      showTime: params.get('showTime') || undefined,
      showDate: params.get('showDate') || undefined,
      format: params.get('format') || undefined,
      screenName: params.get('screenName') || undefined,
      backdropUrl: params.get('backdrop') || undefined,
    };
    const session = this.showtimesStore.sessions().find((item) => item.id === showtimeId);
    if (session) {
      this.useSession(showtimeId, session);
    } else if (metadata.movieTitle) {
      this.store.initShowtimeFromParam(showtimeId, metadata);
    } else {
      void this.showtimesStore.loadSessionsFromApi().then(() => {
        const loadedSession = this.showtimesStore.sessions().find((item) => item.id === showtimeId);
        if (loadedSession) {
          this.useSession(showtimeId, loadedSession);
        }
      });
    }

    // 1. Tải sơ đồ ghế ban đầu từ backend nếu có (layout mô phỏng vẫn luôn sẵn sàng)
    this.loadSeatsMap(showtimeId);

    // 2. Lắng nghe sự kiện SSE theo thời gian thực từ server (không cần reload trang)
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        const sseUrl = `/api/v1/showtimes/stream/${showtimeId}`;
        this.eventSource = new EventSource(sseUrl);
        this.eventSource.addEventListener('seat_update', () => {
          this.loadSeatsMap(showtimeId);
        });
        this.eventSource.onmessage = () => {
          this.loadSeatsMap(showtimeId);
        };
      } catch {
        // Fallback sang cơ chế polling bên dưới
      }
    }

    // 3. Heartbeat polling mỗi 2 giây đảm bảo tab còn lại cập nhật tức thì (ngay cả khi trình duyệt sleep SSE)
    this.pollTimer = setInterval(() => {
      this.loadSeatsMap(showtimeId);
    }, 2000);

    // 4. Đồng hồ đếm ngược theo expiresAt
    this.countdownTimer = setInterval(() => {
      const exp = this.expiresAt();
      if (!exp) return;
      const diff = Math.floor((new Date(exp).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        this.expiresAt.set(null);
        this.store.clearSelectedSeats();
        this.toast.show('Đã hết thời gian giữ ghế. Vui lòng chọn lại!', 'warning');
      } else {
        this.store.setHoldRemainingSeconds(diff);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private currentShowtimeId(): string {
    return (
      this.showtimeId() ||
      this.route.snapshot.paramMap.get('showtimeId') ||
      this.store.showtimeId() ||
      ''
    );
  }

  loadSeatsMap(showtimeId: string): void {
    if (!showtimeId || typeof this.http?.get !== 'function') return;
    this.http.get<any>(`/api/v1/showtimes/${showtimeId}/seats`).subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
          this.backendSeats.set(res.data);
        }
      },
      error: () => {
        // Fallback: sử dụng sơ đồ ghế mô phỏng local
      },
    });
  }

  findSeatIdForLabel(label: string): string {
    const backend = this.backendSeats();
    const found = backend.find((s) => s.label === label || s.seatId === label || s.id === label);
    return found?.seatId || found?.id || label;
  }

  private useSession(showtimeId: string, session: GalaxySession): void {
    this.store.initShowtimeFromParam(showtimeId, {
      movieTitle: session.movie.name,
      movieId: session.movie.dbId || session.movie.id,
      cinemaName: session.cinema.name,
      cinemaId: session.cinema.dbId || '',
      cinemaCode: session.cinema.code,
      showTime: session.showTime,
      showDate: session.showDate,
      format: session.movieFormat,
      screenName: session.screenName,
      backdropUrl: session.movie.imageLandscape || session.movie.imagePortrait,
    });
  }

  onSeatChosen(seat: SeatCell): void {
    if (this.store.selectedSeatIds().has(seat.id)) {
      this.pendingUnselectSeat.set(seat);
      return;
    }

    const showtimeId = this.currentShowtimeId();
    const targetSeatId = this.findSeatIdForLabel(seat.id);

    if (!showtimeId) {
      const toggleRes = this.store.toggleSeat(seat.id, seat.zone);
      if (toggleRes && !toggleRes.ok && toggleRes.reason) {
        this.toast.show(toggleRes.reason, 'warning');
        return;
      }
      this.lastActiveSeat?.set(seat);
      this.toast.show(`Đã giữ ghế ${seat.id}`, 'success');
      return;
    }

    this.http
      .post<any>(`/api/v1/showtimes/${showtimeId}/seat-holds`, {
        showtimeId,
        seatIds: [targetSeatId],
      })
      .subscribe({
        next: (res) => {
          const toggleRes =
            targetSeatId && targetSeatId !== seat.id
              ? this.store.toggleSeat(seat.id, seat.zone, undefined, targetSeatId)
              : this.store.toggleSeat(seat.id, seat.zone);
          if (toggleRes && !toggleRes.ok && toggleRes.reason) {
            this.toast.show(toggleRes.reason, 'warning');
            return;
          }
          this.lastActiveSeat?.set(seat);
          if (res.data?.expiresAt) {
            this.expiresAt?.set(res.data.expiresAt);
          }
          this.toast.show(`Đã giữ ghế ${seat.id}`, 'success');
          void this.liveAnnouncer?.announce(`Đã chọn ghế ${seat.id} hạng ${seat.zone}`);
          if (typeof this.loadSeatsMap === 'function') {
            this.loadSeatsMap(showtimeId);
          }
        },
        error: (err) => {
          if (err?.status === 409) {
            this.toast.show(
              `Ghế ${seat.id} đã bị người khác nhanh tay giữ mất. Vui lòng chọn ghế khác!`,
              'warning',
            );
          } else {
            this.toast.show(
              err?.error?.message || 'Không thể giữ ghế vào lúc này. Vui lòng thử lại!',
              'warning',
            );
          }
          if (typeof this.loadSeatsMap === 'function') {
            this.loadSeatsMap(showtimeId);
          }
        },
      });
  }

  confirmUnselectSeat(seat: SeatCell): void {
    const showtimeId = this.currentShowtimeId();
    const targetSeatId = this.findSeatIdForLabel(seat.id);

    this.store.toggleSeat(seat.id, seat.zone);
    this.pendingUnselectSeat.set(null);
    this.lastActiveSeat.set(null);
    if (this.store.selectedSeats().length === 0) {
      this.expiresAt.set(null);
    }
    this.toast.show(`Đã bỏ chọn ghế ${seat.id}`, 'info');
    void this.liveAnnouncer.announce(`Đã bỏ chọn ghế ${seat.id}`);

    if (showtimeId) {
      this.http
        .delete<any>(`/api/v1/showtimes/${showtimeId}/seat-holds`, {
          body: {
            showtimeId,
            seatIds: [targetSeatId],
          },
        })
        .subscribe({
          next: () => {
            this.loadSeatsMap(showtimeId);
          },
          error: () => {},
        });
    }
  }

  goBack(): void {
    const showtimeId = this.currentShowtimeId();
    const selected = this.store.selectedSeats();
    if (selected.length > 0) {
      const ids = selected.map((s) => this.findSeatIdForLabel(s.id));
      this.http
        .delete<any>(`/api/v1/showtimes/${showtimeId}/seat-holds`, {
          body: {
            showtimeId,
            seatIds: ids,
          },
        })
        .subscribe();
      this.store.clearSelectedSeats();
      this.expiresAt.set(null);
    }
    void this.router.navigateByUrl('/showtimes');
  }

  proceedToConcessions(): void {
    if (this.store.selectedSeats().length === 0) {
      this.toast.show('Vui lòng chọn ít nhất một ghế trước khi tiếp tục.', 'warning');
      return;
    }
    // Không nhả ghế khi đi tiếp sang bắp nước và checkout!
    void this.router.navigateByUrl('/concessions');
  }
}
