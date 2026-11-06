import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { BookingSummaryCardComponent } from '@cinehub/web/booking/ui';
import { ToastService } from '@cinehub/web/core';
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
      <div class="mx-auto max-w-[1440px] px-5 py-6 md:px-9">
        <!-- Nút quay lại & Tiến trình thanh toán 3 Bước -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            (click)="goBack()"
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

        <div class="grid gap-8 lg:grid-cols-12">
          <!-- 3D Seat Map Column -->
          <div
            class="lg:col-span-8 rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            <!-- Curved Screen Visual Indicator -->
            <div class="mb-8 flex flex-col items-center">
              <div
                class="h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_rgba(251,191,36,0.8)]"
              ></div>
              <span class="mt-2 text-[11px] font-black uppercase tracking-[.3em] text-white/60">
                Màn hình chiếu
              </span>
            </div>

            <!-- Seat Legend -->
            <div class="mb-6 flex flex-wrap items-center justify-center gap-5 text-xs font-bold">
              <div class="flex items-center gap-2">
                <span class="h-4 w-4 rounded border border-white/30 bg-slate-700"></span>
                <span class="text-slate-300">Ghế tiêu chuẩn</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="h-4 w-4 rounded border border-amber-400 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                ></span>
                <span class="text-amber-300 font-black">Ghế VIP</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="h-4 w-6 rounded border border-pink-400 bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                ></span>
                <span class="text-pink-300 font-black">Ghế đôi Sweetbox</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-4 w-4 rounded border border-white/10 bg-slate-950 opacity-40"></span>
                <span class="text-slate-500">Đã bán</span>
              </div>
            </div>

            <ch-seat-map-3d
              [layout]="auditoriumLayout()"
              [seats]="seats()"
              (seatChosen)="onSeatChosen($event)"
            />
          </div>

          <!-- Right Sidebar: 3D POV Scene + Summary Card -->
          <div class="lg:col-span-4 space-y-5">
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
              class="w-full rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
            >
              Tiếp tục chọn bắp nước ({{ store.selectedSeats().length }} ghế) →
            </button>
          </div>
        </div>
      </div>
    </main>
  `,
})
export class SeatsPageComponent implements OnInit {
  readonly store = inject(BookingStore);
  private readonly toast = inject(ToastService);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly router = inject(Router);

  readonly showtimeId = input<string>('');
  readonly lastActiveSeat = signal<SeatCell | null>(null);

  readonly auditoriumLayout = computed(() => layoutForCinema(this.store.cinemaName()));

  readonly seats = computed(() =>
    generateAuditoriumSeats(
      this.auditoriumLayout(),
      this.store.selectedSeatIds(),
      this.store.showtimeId(),
    ),
  );

  readonly selectedSeatLabels = computed(() => this.store.selectedSeats().map((s) => s.id));

  ngOnInit(): void {
    if (this.showtimeId()) {
      this.store.initShowtimeFromParam(this.showtimeId());
    }
  }

  onSeatChosen(seat: SeatCell): void {
    const res = this.store.toggleSeat(seat.id, seat.zone);
    if (!res.ok && res.reason) {
      this.toast.show(res.reason, 'warning');
      return;
    }
    this.lastActiveSeat.set(seat);
    void this.liveAnnouncer.announce(`Đã chọn ghế ${seat.id} hạng ${seat.zone}`);
  }

  goBack(): void {
    void this.router.navigateByUrl('/showtimes');
  }

  proceedToConcessions(): void {
    if (this.store.selectedSeats().length === 0) {
      this.store.toggleSeat('F8', 'vip');
    }
    void this.router.navigateByUrl('/concessions');
  }
}
