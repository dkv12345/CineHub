import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { applyVoucherSchema } from '@cinehub/contracts';
import { BookingStore, type IssuedTicket } from '@cinehub/web/booking/data-access';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt, zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="relative min-h-screen overflow-hidden bg-[#020617] text-white selection:bg-amber-400 selection:text-black"
    >
      <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        @if (bookingStore.movieBackdropUrl()) {
          <img
            [src]="bookingStore.movieBackdropUrl()"
            alt=""
            class="h-full w-full scale-105 object-cover object-center opacity-80 blur-[1px]"
          />
        }
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-[#020617]/85 via-[#020617]/75 to-[#020617]"
        ></div>
      </div>
      <div class="relative z-10 mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        <!-- Nút quay lại & Tiến trình thanh toán 3 Bước -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125 text-amber-300"
          >
            ← Quay lại bắp nước
          </button>

          <!-- 3-Step Progress Indicator: Step 3 Active -->
          <nav aria-label="Tiến trình đặt vé" class="flex items-center gap-2 text-xs font-black">
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >1</span
              >
              <span>Chọn ghế</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-amber-300/40"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >2</span
              >
              <span>Bắp nước</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-amber-300/40"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-400/20 px-3.5 py-1.5 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black"
                >3</span
              >
              <span>Thanh toán</span>
            </div>
          </nav>
        </div>

        <!-- Thông báo Trạng thái thanh toán từ Redirect (Thành công / Hủy) -->
        @if (paymentStatusMessage()) {
          <div
            class="mb-6 rounded-2xl border p-4 backdrop-blur-xl shadow-xl transition"
            [class]="
              isPaymentSuccess()
                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                : 'border-amber-500/50 bg-amber-950/60 text-amber-300'
            "
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold">{{ paymentStatusMessage() }}</span>
              <button
                type="button"
                (click)="paymentStatusMessage.set(null)"
                class="text-xs font-black uppercase hover:opacity-75"
              >
                ✕ Đóng
              </button>
            </div>
          </div>
        }

        <div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <!-- Cột trái: Thông tin đơn hàng chi tiết -->
          <div class="flex flex-col gap-6">
            <!-- Header Phim -->
            <div>
              <p class="mb-1 text-xs font-black uppercase tracking-[.2em] text-amber-300">
                Bước 3 · Xác nhận đơn vé
              </p>
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {{ bookingStore.movieTitle().toUpperCase() }}
                </h1>
              </div>
              <p class="mt-2 text-xs font-bold text-slate-200">
                {{ bookingStore.cinemaName() }} · {{ bookingStore.showTime() }} ·
                {{ bookingStore.format() }}
              </p>
            </div>

            <!-- Chi tiết đơn hàng -->
            <section
              class="rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-black text-amber-300">Thông tin đơn hàng</h2>
                @if (bookingStore.bookingCode()) {
                  <span
                    class="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs font-black text-amber-300"
                  >
                    Mã giữ chỗ: {{ bookingStore.bookingCode() }}
                  </span>
                }
              </div>

              <dl class="mt-4 divide-y divide-white/10 text-sm">
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Phim</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.movieTitle() }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Suất chiếu</dt>
                  <dd class="text-right font-black text-white">
                    {{ bookingStore.showTime() }} · {{ bookingStore.showDate() }} ·
                    <span class="text-amber-300">{{ bookingStore.format() }}</span>
                  </dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Thời gian giữ ghế</dt>
                  <dd class="text-right font-black text-amber-300">
                    {{ bookingStore.holdFormatted() }}
                  </dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Phòng chiếu</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.screenName() }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Rạp chiếu</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.cinemaName() }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Ghế ngồi</dt>
                  <dd class="text-right font-black text-emerald-400">
                    {{ seatLabels().length > 0 ? seatLabels().join(', ') : 'Chưa chọn' }}
                  </dd>
                </div>
                @if (concessionsStore.selectedItems().length > 0) {
                  <div class="flex justify-between gap-6 py-3.5">
                    <dt class="font-semibold text-white/70">Bắp nước</dt>
                    <dd class="text-right font-black text-amber-300">
                      @for (c of concessionsStore.selectedItems(); track c.id) {
                        <div>{{ c.name }} (x{{ c.quantity }})</div>
                      }
                    </dd>
                  </div>
                }
              </dl>
            </section>
          </div>

          <!-- Cột phải: Phương thức & Nút Thanh toán -->
          <aside
            class="sticky top-6 flex flex-col gap-5 rounded-3xl border-2 border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <fieldset>
              <legend class="text-base font-black uppercase tracking-wider text-amber-300">
                Phương thức thanh toán
              </legend>

              <div class="mt-4 space-y-3">
                @for (m of gateways; track m.code) {
                  <label
                    (click)="bookingStore.setPaymentMethod(m.code)"
                    class="flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition"
                    [class]="
                      bookingStore.paymentMethod() === m.code
                        ? 'border-amber-400/80 bg-slate-950/70 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                        : 'border-white/20 bg-slate-950/20 hover:border-white/40'
                    "
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      [checked]="bookingStore.paymentMethod() === m.code"
                      class="h-4 w-4 accent-amber-400"
                    />
                    <span
                      class="grid h-9 w-11 place-items-center rounded-lg text-xs font-black text-white shadow-md"
                      [class]="m.badge"
                    >
                      {{ m.mark }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <b class="block text-sm font-black text-white">{{ m.name }}</b>
                      <small class="mt-0.5 block text-[11px] font-semibold text-white/70">{{
                        m.desc
                      }}</small>
                    </span>
                  </label>
                }
              </div>
            </fieldset>

            <!-- Voucher Code Input -->
            <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <span class="text-xs font-bold text-amber-300">Mã giảm giá / Voucher:</span>
              <form [formGroup]="voucherForm" (ngSubmit)="applyVoucher()" class="mt-2 flex gap-2">
                <input
                  type="text"
                  formControlName="code"
                  placeholder="CINEHUB50 / GALAXY30 / VIP2026"
                  class="flex-1 rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs font-bold text-white uppercase placeholder-white/40 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="submit"
                  class="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition"
                >
                  Áp dụng
                </button>
              </form>
              @if (voucherMessage()) {
                <p class="mt-2 text-xs text-amber-300 font-semibold">{{ voucherMessage() }}</p>
              }
            </div>

            <!-- Bảng tính tổng tiền -->
            <div class="space-y-2 border-t border-white/10 pt-4 text-xs font-bold">
              <div class="flex justify-between">
                <span class="text-white">Vé ({{ seatLabels().length || 1 }} ghế)</span>
                <span class="tabular-nums text-amber-300">{{
                  formatCurrency(bookingStore.seatsSubtotal())
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white">Bắp nước</span>
                <span class="tabular-nums text-amber-300">{{
                  formatCurrency(concessionsStore.totalAmount())
                }}</span>
              </div>
              @if (bookingStore.discountAmount() > 0) {
                <div class="flex justify-between text-emerald-400">
                  <span>Giảm giá ({{ bookingStore.voucherCode() }}):</span>
                  <span>− {{ formatCurrency(bookingStore.discountAmount()) }}</span>
                </div>
              }
            </div>

            <!-- Total Amount -->
            <div class="flex items-end justify-between border-t border-white/10 pt-4">
              <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                Tổng cộng
              </span>
              <span class="text-2xl font-black tabular-nums text-amber-300">
                {{ formatCurrency(grandTotal()) }}
              </span>
            </div>

            <!-- Action Buttons -->
            <button
              type="button"
              (click)="confirmPayment()"
              [disabled]="bookingStore.selectedSeats().length === 0 || submittingPayment()"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125 disabled:opacity-50"
            >
              {{ submittingPayment() ? 'Đang xử lý giao dịch...' : 'Thanh toán ngay' }}
            </button>

            <button
              type="button"
              (click)="goBack()"
              class="w-full py-1 text-xs font-bold text-white/60 transition hover:text-white"
            >
              Hủy thanh toán
            </button>
          </aside>
        </div>
      </div>
    </main>
  `,
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  readonly bookingStore = inject(BookingStore);
  readonly concessionsStore = inject(ConcessionsStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private holdTimer: ReturnType<typeof setInterval> | null = null;

  readonly voucherMessage = signal<string | null>(null);
  readonly paymentStatusMessage = signal<string | null>(null);
  readonly isPaymentSuccess = signal<boolean>(false);
  readonly submittingPayment = signal<boolean>(false);

  readonly gateways = [
    {
      code: 'VNPAY' as const,
      name: 'VNPay',
      desc: 'Quét QR hoặc thẻ ATM nội địa',
      badge: 'bg-[#0b4da2]',
      mark: 'VN',
    },
    {
      code: 'ZALOPAY' as const,
      name: 'ZaloPay',
      desc: 'Ví điện tử ZaloPay',
      badge: 'bg-[#1473e6]',
      mark: 'Z',
    },
    {
      code: 'MOMO' as const,
      name: 'Ví MoMo',
      desc: 'Ví điện tử MoMo',
      badge: 'bg-[#a50064]',
      mark: 'M',
    },
    {
      code: 'DEMO' as const,
      name: 'VietQR / Xác nhận nhanh (Demo)',
      desc: 'Chốt đơn MySQL & phát vé QR tức thì',
      badge: 'bg-emerald-600',
      mark: 'QR',
    },
  ];

  readonly voucherForm = this.fb.nonNullable.group(
    {
      code: [''],
    },
    { validators: [zodFormGroupValidator(applyVoucherSchema)] },
  );

  readonly seatLabels = computed(() => this.bookingStore.selectedSeats().map((s) => s.id));

  readonly grandTotal = computed(() => {
    const subtotal = this.bookingStore.seatsSubtotal() + this.concessionsStore.totalAmount();
    return Math.max(0, subtotal - this.bookingStore.discountAmount());
  });

  ngOnInit(): void {
    this.holdTimer = setInterval(() => {
      const tick = this.bookingStore.decrementHold();
      if (tick.expiredNow) {
        this.toast.show('Thời gian giữ ghế đã hết hạn. Vui lòng chọn lại ghế.', 'warning');
        void this.router.navigateByUrl('/showtimes');
      }
    }, 1000);

    // Hứng Query Parameters do MoMo, ZaloPay hoặc VNPay gửi ngược về trang /checkout
    this.route.queryParams.subscribe((params) => {
      const resultCode = params['resultCode']; // MoMo
      const zalopayStatus = params['status']; // ZaloPay
      const vnpResponseCode = params['vnp_ResponseCode']; // VNPay ('00' là thành công)

      if (
        resultCode !== undefined ||
        zalopayStatus !== undefined ||
        vnpResponseCode !== undefined
      ) {
        const isSuccess =
          Number(resultCode) === 0 || Number(zalopayStatus) === 1 || vnpResponseCode === '00';
        void this.handleGatewayReturn(params, isSuccess);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.holdTimer) clearInterval(this.holdTimer);
  }

  private async handleGatewayReturn(
    params: Record<string, string | undefined>,
    isSuccess: boolean,
  ): Promise<void> {
    const gateway =
      params['vnp_ResponseCode'] !== undefined
        ? 'VNPAY'
        : params['resultCode'] !== undefined
          ? 'MOMO'
          : 'ZALOPAY';

    const orderIdFromGateway =
      params['vnp_TxnRef'] ||
      params['orderId'] ||
      params['apptransid'] ||
      this.bookingStore.bookingCode() ||
      this.bookingStore.bookingId();

    try {
      const verifyRes = await firstValueFrom(
        this.http.post<{
          data?: {
            status: string;
            ticket?: IssuedTicket;
          };
        }>('/api/v1/payments/verify-return', {
          gateway,
          bookingId: this.bookingStore.bookingId() || undefined,
          bookingCode: orderIdFromGateway || this.bookingStore.bookingCode() || undefined,
          success: isSuccess,
          amount: this.grandTotal(),
          gatewayTxId: params['vnp_TransactionNo'] || params['transId'] || undefined,
          query: params,
        }),
      );

      if (isSuccess) {
        this.isPaymentSuccess.set(true);
        this.paymentStatusMessage.set('🎉 Thanh toán thành công! Hệ thống đang phát hành vé QR.');

        const serverTicket = verifyRes?.data?.ticket;
        const ticket =
          serverTicket ?? this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
        if (serverTicket) {
          this.bookingStore.recordServerConfirmedTicket(serverTicket);
        }
        this.concessionsStore.clearConcessions();
        this.toast.show(`Thanh toán thành công! Mã đơn vé: ${ticket.bookingCode}`, 'success');
        void this.router.navigate(['/result', ticket.id]);
      } else {
        this.isPaymentSuccess.set(false);
        this.paymentStatusMessage.set(
          '⚠️ Giao dịch thanh toán bị hủy hoặc không thành công. Ghế của bạn vẫn đang được giữ, vui lòng thử lại.',
        );
        this.toast.show(
          'Giao dịch thanh toán đã bị hủy. Bạn có thể chọn thanh toán lại.',
          'warning',
        );
      }
    } catch {
      if (isSuccess) {
        const ticket = this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
        this.concessionsStore.clearConcessions();
        this.toast.show(`Thanh toán thành công! Mã đơn vé: ${ticket.bookingCode}`, 'success');
        void this.router.navigate(['/result', ticket.id]);
      } else {
        this.isPaymentSuccess.set(false);
        this.paymentStatusMessage.set(
          '⚠️ Giao dịch thanh toán bị hủy hoặc không thành công. Vui lòng thử lại.',
        );
        this.toast.show('Giao dịch thanh toán đã bị hủy.', 'warning');
      }
    }
  }

  async applyVoucher(): Promise<void> {
    const raw = this.voucherForm.controls.code.value;
    const res = await this.bookingStore.validateVoucherOnServer(
      raw,
      this.concessionsStore.totalAmount(),
    );
    this.voucherMessage.set(res.message);
    this.toast.show(res.message, res.ok ? 'success' : 'warning');
  }

  async confirmPayment(): Promise<void> {
    if (this.bookingStore.selectedSeats().length === 0) {
      this.toast.show('Vui lòng chọn ít nhất một ghế trước khi thanh toán.', 'warning');
      return;
    }

    this.submittingPayment.set(true);

    // Bước 1: Chốt đơn hàng, bắp nước và voucher trên MySQL (WS5)
    const concessionsPayload = this.concessionsStore.selectedItems().map((c) => ({
      concessionId: c.id,
      name: c.name,
      quantity: c.quantity,
      unitPrice: c.price,
    }));

    const checkoutRes = await this.bookingStore.checkoutOnServer(concessionsPayload);
    if (!checkoutRes.ok) {
      this.submittingPayment.set(false);
      this.toast.show(checkoutRes.message || 'Không thể tạo đơn thanh toán.', 'warning');
      return;
    }

    const bookingIdOrCode =
      checkoutRes.bookingCode ||
      this.bookingStore.bookingCode() ||
      checkoutRes.bookingId ||
      this.bookingStore.bookingId() ||
      `CH${Date.now()}`;
    const finalAmount = checkoutRes.totalAmount ?? this.grandTotal();
    const selectedGateway = this.bookingStore.paymentMethod();

    // Bước 2A: Chế độ xác nhận trực tiếp vào MySQL (VietQR / Demo 1-Chạm)
    if (selectedGateway === 'DEMO') {
      try {
        const verifyRes = await firstValueFrom(
          this.http.post<{
            data?: {
              status: string;
              ticket?: IssuedTicket;
            };
          }>('/api/v1/payments/verify-return', {
            gateway: 'DEMO',
            bookingId: checkoutRes.bookingId || this.bookingStore.bookingId() || undefined,
            bookingCode: bookingIdOrCode,
            success: true,
            amount: finalAmount,
          }),
        );
        this.submittingPayment.set(false);
        const serverTicket = verifyRes?.data?.ticket;
        const ticket =
          serverTicket ?? this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
        if (serverTicket) {
          this.bookingStore.recordServerConfirmedTicket(serverTicket);
        }
        this.concessionsStore.clearConcessions();
        this.toast.show(`Đặt vé thành công! Mã đơn vé: ${ticket.bookingCode}`, 'success');
        void this.router.navigate(['/result', ticket.id]);
        return;
      } catch {
        this.submittingPayment.set(false);
        const ticket = this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
        this.concessionsStore.clearConcessions();
        this.toast.show(`Đặt vé thành công! Mã đặt vé: ${ticket.bookingCode}`, 'success');
        void this.router.navigate(['/result', ticket.id]);
        return;
      }
    }

    // Bước 2B: Kết nối cổng thanh toán MoMo / ZaloPay / VNPay
    const gatewayEndpoint =
      selectedGateway === 'MOMO'
        ? '/api/v1/payments/momo/create'
        : selectedGateway === 'ZALOPAY'
          ? '/api/v1/payments/zalopay/create'
          : '/api/v1/payments/vnpay/create';

    this.toast.show(`Đang kết nối cổng thanh toán ${selectedGateway}...`, 'info');

    this.http
      .post<{ payUrl: string }>(gatewayEndpoint, {
        bookingId: bookingIdOrCode,
        bookingCode: bookingIdOrCode,
        amount: finalAmount,
      })
      .subscribe({
        next: (res) => {
          this.submittingPayment.set(false);
          if (res.payUrl) {
            window.location.href = res.payUrl;
          } else {
            this.toast.show(`Không thể tạo liên kết thanh toán ${selectedGateway}.`, 'warning');
          }
        },
        error: (err) => {
          this.submittingPayment.set(false);
          this.toast.show(
            err.error?.message || `Không thể kết nối ${selectedGateway}. Vui lòng thử lại!`,
            'warning',
          );
        },
      });
  }

  goBack(): void {
    void this.router.navigateByUrl('/concessions');
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
