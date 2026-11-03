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
    <div class="cinema-container py-8 sm:py-12">
      <!-- Breadcrumb and Steps -->
      <div class="mb-6 space-y-1">
        <span class="cinema-eyebrow">Bước 1 / 3 · Phòng chiếu</span>
        <h1 class="font-display text-[var(--text-h2)] font-bold text-[var(--color-text-primary)]">
          Chọn ghế ngồi & Góc nhìn 3D POV
        </h1>
        <p class="text-xs text-[var(--color-text-secondary)]">
          {{ store.movieTitle() }} · {{ store.cinemaName() }} · Suất {{ store.showTime() }} ({{
            store.format()
          }})
        </p>
      </div>

      <div class="grid gap-8 lg:grid-cols-12 lg:gap-8">
        <!-- 3D Seat Map Column -->
        <div class="cinema-panel p-5 sm:p-7 lg:col-span-8 shadow-xs">
          <ch-seat-map-3d
            [layout]="auditoriumLayout()"
            [seats]="seats()"
            (seatChosen)="onSeatChosen($event)"
          />
        </div>

        <!-- Right Column: 3D POV Scene + Summary Card + Proceed Action -->
        <div class="space-y-5 lg:col-span-4">
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

          <!-- Solid CineHub Burgundy CTA -->
          <button
            type="button"
            (click)="proceedToCheckout()"
            class="cinema-btn-primary w-full !min-h-[46px] !text-sm font-bold shadow-sm"
          >
            Tiếp tục thanh toán ({{ store.selectedSeats().length }} ghế)
          </button>
        </div>
      </div>
    </div>
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
