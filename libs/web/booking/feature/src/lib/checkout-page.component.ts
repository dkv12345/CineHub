import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { applyVoucherSchema } from '@cinehub/contracts';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { BookingSummaryCardComponent } from '@cinehub/web/booking/ui';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt, zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BookingSummaryCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-container max-w-5xl py-8 sm:py-12">
      <div class="mb-6 space-y-1">
        <span class="cinema-eyebrow">Bước 2 / 3 · Thủ tục đặt vé</span>
        <h1
          class="font-display text-[var(--text-h2)] font-semibold text-[var(--cinema-text-primary)]"
        >
          Thanh toán & Xác nhận vé điện tử
        </h1>
        <p class="text-xs text-[var(--cinema-text-muted)]">
          Kiểm tra thông tin chi tiết vé, mã giảm giá và lựa chọn cổng thanh toán trực tuyến an
          toàn.
        </p>
      </div>

      <div class="grid gap-8 lg:grid-cols-12 lg:gap-8">
        <!-- Left: Gateway & Voucher Selection -->
        <div class="space-y-6 lg:col-span-7">
          <!-- Payment Gateway Selection -->
          <div class="cinema-panel p-5 space-y-4">
            <div>
              <span class="cinema-eyebrow">Phương thức thanh toán</span>
              <h2 class="font-display text-base font-semibold text-[var(--cinema-text-primary)]">
                Chọn cổng thanh toán trực tuyến
              </h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Cổng thanh toán">
              @for (m of gateways; track m.code) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="bookingStore.paymentMethod() === m.code"
                  (click)="bookingStore.setPaymentMethod(m.code)"
                  class="rounded-[3px] border p-3.5 text-left transition-colors"
                  [class]="
                    bookingStore.paymentMethod() === m.code
                      ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
                      : 'border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
                  "
                >
                  <div class="text-sm font-semibold">{{ m.name }}</div>
                  <div class="mt-0.5 text-[11px] text-[var(--cinema-text-muted)]">{{ m.desc }}</div>
                </button>
              }
            </div>
          </div>

          <!-- Voucher Form (Contract-First Zod Validator) -->
          <div class="cinema-panel p-5 space-y-3">
            <div>
              <span class="cinema-eyebrow">Mã ưu đãi</span>
              <h2 class="font-display text-base font-semibold text-[var(--cinema-text-primary)]">
                Phiếu giảm giá / Thẻ quà tặng
              </h2>
            </div>

            <form [formGroup]="voucherForm" (ngSubmit)="applyVoucher()" class="flex gap-2">
              <input
                type="text"
                formControlName="code"
                placeholder="Nhập mã (VD: CINEHUB50, GALAXY30)"
                aria-label="Mã giảm giá"
                class="cinema-input flex-1 uppercase"
              />
              <button type="submit" class="cinema-btn-secondary !min-h-[44px] !px-4">
                Áp dụng
              </button>
            </form>

            @if (voucherMessage()) {
              <p class="text-xs text-[var(--cinema-accent)]">{{ voucherMessage() }}</p>
            }
          </div>
        </div>

        <!-- Right: Order Summary & Confirmation Action -->
        <div class="space-y-5 lg:col-span-5">
          <ch-booking-summary-card
            [movieTitle]="bookingStore.movieTitle()"
            [cinemaName]="bookingStore.cinemaName()"
            [showTime]="bookingStore.showTime()"
            [format]="bookingStore.format()"
            [seatLabels]="seatLabels()"
            [holdFormatted]="bookingStore.holdFormatted()"
            [totalAmount]="grandTotal()"
          />

          <!-- Line Items Breakdown -->
          <div class="cinema-panel p-4 space-y-2 text-xs text-[var(--cinema-text-secondary)]">
            <div class="flex justify-between">
              <span>Tiền ghế ({{ seatLabels().length }} ghế):</span>
              <span class="text-[var(--cinema-text-primary)]">{{
                formatCurrency(bookingStore.seatsSubtotal())
              }}</span>
            </div>
            <div class="flex justify-between">
              <span>Combo Bắp & Nước:</span>
              <span class="text-[var(--cinema-text-primary)]">{{
                formatCurrency(concessionsStore.totalAmount())
              }}</span>
            </div>
            @if (bookingStore.discountAmount() > 0) {
              <div class="flex justify-between text-[var(--cinema-success)]">
                <span>Ưu đãi voucher:</span>
                <span>− {{ formatCurrency(bookingStore.discountAmount()) }}</span>
              </div>
            }
          </div>

          <!-- Solid Action Button (No Gradients) -->
          <button
            type="button"
            (click)="confirmPayment()"
            class="cinema-btn-primary w-full !min-h-[48px] !text-sm font-semibold"
          >
            Xác nhận thanh toán · {{ formatCurrency(grandTotal()) }}
          </button>

          <div class="text-center">
            <a
              routerLink="/concessions"
              class="text-xs font-medium text-[var(--cinema-text-secondary)] hover:text-[var(--cinema-accent)] hover:underline"
            >
              + Đặt thêm Combo Bắp & Nước quầy ưu tiên
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CheckoutPageComponent {
  readonly bookingStore = inject(BookingStore);
  readonly concessionsStore = inject(ConcessionsStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly voucherMessage = signal<string | null>(null);

  readonly gateways = [
    { code: 'VNPAY' as const, name: 'VNPay QR', desc: 'Quét mã VietQR ngân hàng' },
    { code: 'MOMO' as const, name: 'Ví MoMo', desc: 'Thanh toán tức thời' },
    { code: 'ZALOPAY' as const, name: 'ZaloPay', desc: 'Ví điện tử ZaloPay' },
  ];

  readonly voucherForm = this.fb.nonNullable.group(
    {
      code: [''],
    },
    { validators: [zodFormGroupValidator(applyVoucherSchema)] },
  );

  readonly seatLabels = computed(() => this.bookingStore.selectedSeats().map((s) => s.id));

  readonly grandTotal = computed(() => {
    const subtotal =
      (this.bookingStore.seatsSubtotal() || 115000) + this.concessionsStore.totalAmount();
    return Math.max(0, subtotal - this.bookingStore.discountAmount());
  });

  applyVoucher(): void {
    const raw = this.voucherForm.controls.code.value;
    const res = this.bookingStore.applyVoucher(raw);
    this.voucherMessage.set(res.message);
    this.toast.show(res.message, res.ok ? 'success' : 'warning');
  }

  confirmPayment(): void {
    const ticket = this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
    this.concessionsStore.clearConcessions();
    this.toast.show(`Đặt vé thành công! Mã đặt vé: ${ticket.bookingCode}`, 'success');
    void this.router.navigate(['/result', ticket.id]);
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
