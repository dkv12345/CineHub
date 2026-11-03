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
    <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-white sm:text-3xl">
            Chọn ghế ngồi & Góc nhìn 3D POV
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            {{ store.movieTitle() }} · {{ store.cinemaName() }} · Suất {{ store.showTime() }} ({{
              store.format()
            }})
          </p>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-12">
        <!-- 3D Seat Map Column -->
        <div class="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 sm:p-6">
          <ch-seat-map-3d
            [layout]="auditoriumLayout()"
            [seats]="seats()"
            (seatChosen)="onSeatChosen($event)"
          />
        </div>

        <!-- Right Sidebar: 3D POV Scene + Summary Card -->
        <div class="lg:col-span-4 space-y-5">
          <ch-seat-pov-scene [layout]="auditoriumLayout()" [activeSeat]="lastActiveSeat()" />

          <ch-booking-summary-card
            [movieTitle]="store.movieTitle()"
            [cinemaName]="store.cinemaName()"
            [showTime]="store.showTime()"
            [format]="store.format()"
            [seatLabels]="selectedSeatLabels()"
            [holdFormatted]="store.holdFormatted()"
            [totalAmount]="store.seatsSubtotal()"
          />

          <button
            type="button"
            (click)="proceedToCheckout()"
            class="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Tiếp tục thanh toán ({{ store.selectedSeats().length }} ghế)
          </button>
        </div>
      </div>
    </section>
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

  proceedToCheckout(): void {
    if (this.store.selectedSeats().length === 0) {
      this.store.toggleSeat('F8', 'vip');
    }
    void this.router.navigateByUrl('/checkout');
  }
}
