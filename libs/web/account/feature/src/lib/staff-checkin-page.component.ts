import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import jsQR from 'jsqr';
import { AuthStore, ToastService } from '@cinehub/web/core';

interface CheckinTicketResult {
  readonly ticketId: string;
  readonly status: string;
  readonly usedAt: string;
  readonly bookingCode: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly movieTitle: string;
  readonly cinemaName: string;
  readonly auditoriumName: string;
  readonly startTime: string;
  readonly seats: readonly string[];
}

interface StaffStats {
  readonly totalIssued: number;
  readonly checkedInCount: number;
  readonly validCount: number;
  readonly recentCheckins?: Array<{
    ticketId: string;
    bookingCode: string;
    seatLabel: string;
    movieTitle: string;
    cinemaName: string;
    screenName: string;
    customerName: string;
    usedAt: string;
    checkedInBy: string;
  }>;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
    webkitAudioContext?: typeof AudioContext;
  }
}

@Component({
  selector: 'ch-staff-checkin-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      @keyframes laserScanSweep {
        0% {
          top: 6%;
          opacity: 0.3;
        }
        50% {
          top: 92%;
          opacity: 1;
        }
        100% {
          top: 6%;
          opacity: 0.3;
        }
      }

      @keyframes reticleGlow {
        0%,
        100% {
          box-shadow:
            0 0 15px rgba(56, 189, 248, 0.3),
            inset 0 0 15px rgba(56, 189, 248, 0.2);
          border-color: rgba(56, 189, 248, 0.7);
        }
        50% {
          box-shadow:
            0 0 30px rgba(56, 189, 248, 0.6),
            inset 0 0 25px rgba(56, 189, 248, 0.4);
          border-color: rgba(56, 189, 248, 1);
        }
      }

      .laser-beam {
        animation: laserScanSweep 2s ease-in-out infinite;
      }

      .viewfinder-box {
        animation: reticleGlow 3s ease-in-out infinite;
      }
    `,
  ],
  template: `
    <main class="min-h-screen bg-[#020617] px-5 py-8 text-white md:px-9 font-sans">
      <div class="mx-auto max-w-5xl space-y-7">
        <!-- Header & Live Gate Counter -->
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5"
        >
          <div>
            <div
              class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400"
            >
              <span class="flex h-2 w-2 relative">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>CỔNG SOÁT VÉ NHÂN VIÊN · UC-27 & PORTAL</span>
            </div>
            <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
              Quét mã QR & Kiểm soát vào rạp (Live Camera Gate)
            </h1>
            <p class="mt-1 text-xs text-slate-400">
              Hỗ trợ máy quét Camera trực tiếp, kính ngắm laser, âm thanh Web Audio và xác thực chữ
              ký HMAC-SHA256.
            </p>
          </div>

          <div class="flex gap-3">
            <div
              class="rounded-2xl border border-emerald-400/30 bg-emerald-950/60 px-4 py-2.5 text-center shadow-lg"
            >
              <span class="block text-[10px] font-black uppercase text-emerald-300"
                >Đã vào rạp</span
              >
              <b class="text-xl font-black text-emerald-400 font-mono">{{
                stats().checkedInCount
              }}</b>
            </div>
            <div
              class="rounded-2xl border border-amber-400/30 bg-amber-950/60 px-4 py-2.5 text-center shadow-lg"
            >
              <span class="block text-[10px] font-black uppercase text-amber-300">Chờ soát</span>
              <b class="text-xl font-black text-amber-400 font-mono">{{ stats().validCount }}</b>
            </div>
            <div
              class="rounded-2xl border border-white/15 bg-slate-900 px-4 py-2.5 text-center shadow-lg"
            >
              <span class="block text-[10px] font-black uppercase text-slate-400">Tổng vé</span>
              <b class="text-xl font-black text-white font-mono">{{ stats().totalIssued }}</b>
            </div>
          </div>
        </div>

        <!-- Sound & Action Testing Bar -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 text-xs"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">🔊</span>
            <span class="font-bold text-blue-200">Kiểm thử âm thanh Web Audio & Kính ngắm:</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="testSoundSuccess()"
              class="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3.5 py-1.5 font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"
            >
              ♫ Test Chime Thành Công
            </button>
            <button
              type="button"
              (click)="testSoundError()"
              class="rounded-xl border border-red-400/50 bg-red-500/20 px-3.5 py-1.5 font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              ⚠ Test Buzz Từ Chối
            </button>
            <button
              type="button"
              (click)="testMockCheckin()"
              class="rounded-xl border border-amber-400/50 bg-amber-500/20 px-3.5 py-1.5 font-bold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
            >
              🧪 Giả lập Quét vé mẫu
            </button>
          </div>
        </div>

        <!-- Result Banner: When Check-in succeeds -->
        @if (lastCheckedIn(); as res) {
          <section
            class="relative overflow-hidden rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-950/90 via-slate-950 to-emerald-950/80 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/30 pb-4"
            >
              <div class="flex items-center gap-3">
                <span
                  class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/50"
                >
                  ✓
                </span>
                <div>
                  <span class="text-xs font-black uppercase tracking-wider text-emerald-300">
                    HỢP LỆ · CHO PHÉP KHÁCH QUA CỔNG
                  </span>
                  <h2 class="text-xl font-black text-white sm:text-2xl">
                    Mã đơn: <span class="font-mono text-amber-300">{{ res.bookingCode }}</span>
                  </h2>
                </div>
              </div>

              <div class="text-right">
                <span
                  class="inline-block rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md"
                >
                  USED · Check-in lúc {{ res.usedAt }}
                </span>
                <span class="mt-1 block text-[11px] font-bold text-emerald-200">
                  Áp dụng cho toàn bộ {{ res.seats.length }} ghế
                </span>
              </div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
                <span class="text-emerald-200/70 font-semibold">Tên phim</span>
                <b class="mt-1 block text-sm font-black text-white">{{ res.movieTitle }}</b>
              </div>

              <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
                <span class="text-emerald-200/70 font-semibold">Rạp & Phòng chiếu</span>
                <b class="mt-1 block text-sm font-black text-white">
                  {{ res.cinemaName }} · {{ res.auditoriumName }}
                </b>
              </div>

              <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
                <span class="text-emerald-200/70 font-semibold">Danh sách ghế vào rạp</span>
                <b class="mt-1 block text-base font-black text-amber-300 font-mono">
                  {{ res.seats.join(', ') }}
                </b>
              </div>

              <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
                <span class="text-emerald-200/70 font-semibold">Khách hàng</span>
                <b class="mt-1 block text-xs font-bold text-white truncate">
                  {{ res.customerName }}
                </b>
                <span class="text-[11px] text-slate-400 truncate block">{{
                  res.customerEmail
                }}</span>
              </div>
            </div>
          </section>
        }

        <!-- Error Banner -->
        @if (errorBanner(); as err) {
          <section
            class="rounded-3xl border-2 border-red-500 bg-red-950/80 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200"
          >
            <div class="flex items-start gap-3">
              <span
                class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500 text-lg font-black text-white"
              >
                ✕
              </span>
              <div class="min-w-0 flex-1">
                <b class="block text-sm font-black text-red-200 uppercase tracking-wide">
                  Từ chối vào cổng ({{ errorCode() || 'TỪ CHỐI' }})
                </b>
                <p class="mt-1 text-xs font-semibold text-red-300 leading-relaxed">
                  {{ err }}
                </p>
              </div>
              <button
                type="button"
                (click)="errorBanner.set(null)"
                class="text-xs font-black uppercase text-red-400 hover:text-white"
              >
                Đóng ✕
              </button>
            </div>
          </section>
        }

        <!-- LIVE CAMERA SCANNER VIEWPORT -->
        <section
          class="overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"
          >
            <div class="flex items-center gap-3.5">
              <span
                class="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/20 text-2xl text-cyan-400 border border-cyan-400/30"
              >
                📷
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-black uppercase tracking-wider text-white">
                    MÁY QUÉT CAMERA TRỰC TIẾP (LIVE SCANNER)
                  </h2>
                  <span
                    class="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-300 border border-cyan-500/30"
                  >
                    Auto-Detect 250ms
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">
                  Đưa mã QR trên vé khách hàng vào kính ngắm laser, hệ thống sẽ tự động quét và
                  duyệt qua cổng.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              @if (cameraActive()) {
                <button
                  type="button"
                  (click)="switchCamera()"
                  class="rounded-xl border border-white/20 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                >
                  🔄 Đổi Camera ({{ cameraFacingMode() === 'environment' ? 'Sau' : 'Trước' }})
                </button>
                <button
                  type="button"
                  (click)="stopCamera()"
                  class="rounded-xl border border-red-500/50 bg-red-500/25 px-5 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/20"
                >
                  🛑 TẮT CAMERA
                </button>
              }
            </div>
          </div>

          <div class="mt-6 flex flex-col items-center">
            <div
              class="relative w-full max-w-lg aspect-square overflow-hidden rounded-3xl border-2 bg-slate-950 shadow-2xl transition-all duration-300"
              [class.border-cyan-400]="flashState() === 'idle'"
              [class.border-emerald-400]="flashState() === 'success'"
              [class.border-red-500]="flashState() === 'error'"
              [class.shadow-emerald-500_50]="flashState() === 'success'"
              [class.shadow-red-500_50]="flashState() === 'error'"
            >
              @if (cameraActive()) {
                <video
                  #videoElement
                  autoplay
                  playsinline
                  muted
                  class="h-full w-full object-cover"
                ></video>

                <div class="pointer-events-none absolute inset-0 grid place-items-center">
                  <div class="absolute inset-0 bg-slate-950/30"></div>

                  <div
                    class="laser-beam pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee]"
                  ></div>

                  <div
                    class="viewfinder-box relative h-64 w-64 rounded-2xl border-2 border-cyan-400/80 transition-all duration-300"
                    [class.!border-emerald-400]="flashState() === 'success'"
                    [class.!border-red-400]="flashState() === 'error'"
                  >
                    <span
                      class="absolute -top-1.5 -left-1.5 h-7 w-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"
                    ></span>
                    <span
                      class="absolute -top-1.5 -right-1.5 h-7 w-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"
                    ></span>
                    <span
                      class="absolute -bottom-1.5 -left-1.5 h-7 w-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"
                    ></span>
                    <span
                      class="absolute -bottom-1.5 -right-1.5 h-7 w-7 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"
                    ></span>

                    <div class="absolute inset-0 grid place-items-center">
                      <span class="h-2 w-2 rounded-full bg-cyan-400/80 animate-ping"></span>
                    </div>
                  </div>

                  <div class="absolute bottom-5 left-4 right-4 flex justify-center">
                    <span
                      class="rounded-full px-4 py-1.5 text-xs font-bold backdrop-blur-md transition-colors shadow-lg"
                      [class.bg-slate-900_90]="flashState() === 'idle'"
                      [class.text-cyan-300]="flashState() === 'idle'"
                      [class.border]="flashState() === 'idle'"
                      [class.border-cyan-500_30]="flashState() === 'idle'"
                      [class.bg-emerald-500]="flashState() === 'success'"
                      [class.text-slate-950]="flashState() === 'success'"
                      [class.bg-red-500]="flashState() === 'error'"
                      [class.text-white]="flashState() === 'error'"
                    >
                      {{ scanStatus() }}
                    </span>
                  </div>
                </div>
              } @else {
                <div
                  class="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-radial from-slate-900 to-slate-950"
                >
                  <div
                    class="relative mb-5 grid h-24 w-24 place-items-center rounded-3xl border-2 border-dashed border-cyan-500/50 bg-cyan-950/30 text-4xl text-cyan-400 shadow-2xl"
                  >
                    📷
                    <span class="absolute -top-1 -right-1 flex h-4 w-4">
                      <span
                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"
                      ></span>
                      <span class="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                    </span>
                  </div>

                  <h3 class="text-xl font-black text-white">Máy quét Camera chưa bật</h3>
                  <p class="mt-2 max-w-sm text-xs text-slate-400 leading-relaxed">
                    Nhấn nút bên dưới để cấp quyền Camera cho trình duyệt và bắt đầu quét mã QR tự
                    động bằng kính ngắm laser.
                  </p>

                  <button
                    type="button"
                    (click)="startCamera()"
                    class="mt-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 hover:brightness-125"
                  >
                    <span class="text-lg">📷</span>
                    <span>BẬT CAMERA QUÉT TRỰC TIẾP</span>
                  </button>
                </div>
              }
            </div>

            <p class="mt-3 text-center text-xs text-slate-400">
              💡 Căn chỉnh mã QR vé khách hàng vào giữa khung ngắm để hệ thống tự động nhận diện và
              soát vé.
            </p>
          </div>
        </section>

        <!-- 2 Main Scanning / Lookup Sections -->
        <div class="grid gap-6 md:grid-cols-2">
          <!-- Form 1: Quét / Dán mã QR ký số -->
          <section class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              1. Quét hoặc dán mã QR vé điện tử
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Xác thực chữ ký <code class="text-amber-200">HMAC-SHA256(ticketId.qrVersion)</code> và
              chuyển trạng thái <code class="text-emerald-300">VALID → USED</code>.
            </p>

            <form [formGroup]="qrForm" (ngSubmit)="submitQrCheckin()" class="mt-4 space-y-4">
              <div>
                <label for="qr-input" class="block text-xs font-bold text-slate-300">
                  Chuỗi QR Payload (<code class="text-amber-300">ticketId.signature</code>)
                </label>
                <input
                  id="qr-input"
                  type="text"
                  formControlName="qrPayload"
                  placeholder="Dán mã QR từ trang Vé của tôi..."
                  class="mt-1.5 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3 font-mono text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:brightness-125 disabled:opacity-50"
              >
                {{ loading() ? 'Đang xác thực chữ ký...' : 'Xác thực & Check-in QR' }}
              </button>
            </form>
          </section>

          <!-- Form 2: Tra cứu thủ công theo Mã đơn / SĐT -->
          <section class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              2. Soát vé thủ công (Mã đặt vé / SĐT)
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Dành cho khách hàng không mở được màn hình QR tại cổng kiểm soát.
            </p>

            <form
              [formGroup]="manualForm"
              (ngSubmit)="submitManualCheckin()"
              class="mt-4 space-y-4"
            >
              <div>
                <label for="booking-code-input" class="block text-xs font-bold text-slate-300">
                  Mã đặt vé (ví dụ: <code class="text-amber-300">CH-XXXXXX</code>)
                </label>
                <input
                  id="booking-code-input"
                  type="text"
                  formControlName="bookingCode"
                  placeholder="CH-123456"
                  class="mt-1.5 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-2.5 font-mono text-xs uppercase text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="phone-input" class="block text-xs font-bold text-slate-300">
                  Hoặc Số điện thoại khách hàng
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  formControlName="phone"
                  placeholder="0901234567"
                  class="mt-1.5 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-2xl border border-white/20 bg-slate-800 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {{ loading() ? 'Đang tra cứu...' : 'Tra cứu & Duyệt qua cổng' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class StaffCheckinPageComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  readonly stats = signal<StaffStats>({ totalIssued: 0, checkedInCount: 0, validCount: 0 });
  readonly loading = signal<boolean>(false);
  readonly lastCheckedIn = signal<CheckinTicketResult | null>(null);
  readonly errorBanner = signal<string | null>(null);
  readonly errorCode = signal<string | null>(null);

  // Live Camera states
  readonly cameraActive = signal<boolean>(false);
  readonly cameraFacingMode = signal<'environment' | 'user'>('environment');
  readonly scanStatus = signal<string>('Sẵn sàng dò mã');
  readonly flashState = signal<'idle' | 'success' | 'error'>('idle');

  private mediaStream: MediaStream | null = null;
  private scanTimerId: any = null;
  private isScanningPaused = false;
  private audioCtx: AudioContext | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  readonly qrForm = this.fb.nonNullable.group({
    qrPayload: [''],
  });

  readonly manualForm = this.fb.nonNullable.group({
    bookingCode: [''],
    phone: [''],
  });

  ngOnInit(): void {
    void this.loadStats();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.closeAudio();
  }

  async loadStats(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{
          data?: {
            totalIssuedCount?: number;
            totalIssued?: number;
            checkedInCount?: number;
          };
        }>('/api/v1/staff/stats'),
      );
      if (res?.data) {
        const total = res.data.totalIssuedCount ?? res.data.totalIssued ?? 0;
        const checkedIn = res.data.checkedInCount ?? 0;
        const valid = Math.max(0, total - checkedIn);
        this.stats.set({
          totalIssued: total,
          checkedInCount: checkedIn,
          validCount: valid,
        });
      }
    } catch {
      // ignore
    }
  }

  // --- Sound Effects using Web Audio API ---
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private closeAudio(): void {
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }
  }

  testSoundSuccess(): void {
    this.playSuccessSound();
    this.toast.show('🔊 Đã phát âm thanh Chime xác nhận thành công.', 'info');
  }

  testSoundError(): void {
    this.playErrorSound();
    this.toast.show('⚠ Đã phát âm thanh Buzz từ chối vào cổng.', 'warning');
  }

  testMockCheckin(): void {
    this.flashState.set('success');
    this.playSuccessSound();
    this.lastCheckedIn.set({
      ticketId: 'mock-ticket-id',
      bookingCode: 'CH' + Math.floor(100000 + Math.random() * 900000),
      status: 'USED',
      usedAt: new Date().toLocaleTimeString('vi-VN'),
      customerName: 'Khách hàng VIP (Demo Test)',
      customerEmail: 'vip@cinehub.vn',
      movieTitle: 'Avatar: Dòng Chảy Của Nước',
      cinemaName: 'CineHub Thủ Thiêm',
      auditoriumName: 'Phòng IMAX Laser 01',
      startTime: '19:30',
      seats: ['E10', 'E11'],
    });
    this.toast.show('🧪 Đã chạy kịch bản quét vé giả lập thành công!', 'success');
    setTimeout(() => this.flashState.set('idle'), 2000);
  }

  private playSuccessSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.08);

      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([60, 40, 80]);
      }
    } catch {
      // ignore
    }
  }

  private playErrorSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
    } catch {
      // ignore
    }
  }

  // --- Live Camera Scanner ---
  async startCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.toast.show('Trình duyệt không hỗ trợ truy cập Camera.', 'error');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.cameraFacingMode(),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      this.cameraActive.set(true);
      this.scanStatus.set('Đang dò mã QR trong kính ngắm...');

      setTimeout(() => {
        if (this.videoRef?.nativeElement && this.mediaStream) {
          const video = this.videoRef.nativeElement;
          video.srcObject = this.mediaStream;
          video.play().catch(() => undefined);
          this.initBarcodeDetection(video);
        }
      }, 100);
    } catch (err: any) {
      this.toast.show(
        'Không thể mở camera: ' + (err?.message || 'Quyền truy cập bị từ chối.'),
        'error',
      );
    }
  }

  switchCamera(): void {
    const nextMode = this.cameraFacingMode() === 'environment' ? 'user' : 'environment';
    this.cameraFacingMode.set(nextMode);
    this.stopCamera();
    void this.startCamera();
  }

  stopCamera(): void {
    if (this.scanTimerId) {
      clearInterval(this.scanTimerId);
      this.scanTimerId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
    this.flashState.set('idle');
  }

  private initBarcodeDetection(video: HTMLVideoElement): void {
    if (typeof document !== 'undefined' && !this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
      this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true });
    }

    const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let nativeDetector: any = null;
    if (hasDetector) {
      try {
        nativeDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39'],
        });
      } catch {
        nativeDetector = null;
      }
    }

    this.scanTimerId = setInterval(async () => {
      if (
        this.isScanningPaused ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      try {
        let detectedValue: string | null = null;

        // Path 1: Native BarcodeDetector (Android / Chrome flags)
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedValue = barcodes[0].rawValue;
            }
          } catch {
            // fallback to jsQR
          }
        }

        // Path 2: jsQR Canvas Decoder (100% cross-platform for Mac, iOS Safari, Chrome, Edge)
        if (!detectedValue && this.canvasElement && this.canvasContext) {
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (this.canvasElement.width !== width || this.canvasElement.height !== height) {
            this.canvasElement.width = width;
            this.canvasElement.height = height;
          }

          this.canvasContext.drawImage(video, 0, 0, width, height);
          const imageData = this.canvasContext.getImageData(0, 0, width, height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qrCode && qrCode.data) {
            detectedValue = qrCode.data.trim();
          }
        }

        if (detectedValue) {
          this.isScanningPaused = true;
          this.scanStatus.set(`Đã tìm thấy mã: ${detectedValue.slice(0, 16)}...`);
          await this.executeCheckin({ qrPayload: detectedValue });

          setTimeout(() => {
            this.isScanningPaused = false;
            this.scanStatus.set('Đang dò mã QR trong kính ngắm...');
            this.flashState.set('idle');
          }, 2500);
        }
      } catch {
        // frame decode ignore
      }
    }, 150);
  }

  async submitQrCheckin(): Promise<void> {
    const qrPayload = this.qrForm.controls.qrPayload.value.trim();
    if (!qrPayload) {
      this.toast.show('Vui lòng dán hoặc quét chuỗi mã QR.', 'warning');
      return;
    }
    await this.executeCheckin({ qrPayload });
  }

  async submitManualCheckin(): Promise<void> {
    const bookingCode = this.manualForm.controls.bookingCode.value.trim();
    const phone = this.manualForm.controls.phone.value.trim();
    if (!bookingCode && !phone) {
      this.toast.show('Vui lòng nhập Mã đặt vé hoặc Số điện thoại.', 'warning');
      return;
    }
    await this.executeCheckin({
      bookingCode: bookingCode || undefined,
      phone: phone || undefined,
    });
  }

  private async executeCheckin(payload: {
    qrPayload?: string;
    bookingCode?: string;
    phone?: string;
  }): Promise<void> {
    this.loading.set(true);
    this.errorBanner.set(null);
    this.errorCode.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<{
          data?: any;
        }>('/api/v1/staff/checkin', payload),
      );

      this.loading.set(false);
      if (res?.data) {
        const rawSeats =
          res.data.seats ||
          res.data.ticket?.seats ||
          (res.data.seatLabel ? res.data.seatLabel.split(',').map((s: string) => s.trim()) : []) ||
          (res.data.ticket?.seatLabel
            ? res.data.ticket.seatLabel.split(',').map((s: string) => s.trim())
            : []);
        const seatsArray = (Array.isArray(rawSeats) ? rawSeats : [String(rawSeats)]).filter(
          Boolean,
        );

        const ticketData: CheckinTicketResult = {
          ticketId: res.data.ticketId || res.data.ticket?.ticketId || '',
          status: res.data.status || res.data.ticket?.status || 'USED',
          usedAt:
            res.data.usedAt || res.data.ticket?.usedAt || new Date().toLocaleTimeString('vi-VN'),
          bookingCode: res.data.bookingCode || res.data.ticket?.bookingCode || '',
          customerName: res.data.customerName || res.data.ticket?.customerName || 'Khách hàng',
          customerEmail: res.data.customerEmail || res.data.ticket?.customerEmail || '',
          movieTitle: res.data.movieTitle || res.data.ticket?.movieTitle || 'Phim CineHub',
          cinemaName: res.data.cinemaName || res.data.ticket?.cinemaName || '',
          auditoriumName: res.data.auditoriumName || res.data.ticket?.auditoriumName || '',
          startTime: res.data.startTime || res.data.ticket?.startTime || 'Suất chiếu',
          seats: seatsArray.length > 0 ? seatsArray : ['Ghế'],
        };

        this.lastCheckedIn.set(ticketData);
        this.flashState.set('success');
        this.playSuccessSound();
        this.toast.show(res.data.message || 'Check-in vé thành công!', 'success');
        this.qrForm.reset();
        this.manualForm.reset();

        const currentStats = this.stats();
        const seatsCount = ticketData.seats.length || 1;
        this.stats.set({
          ...currentStats,
          checkedInCount: currentStats.checkedInCount + seatsCount,
          validCount: Math.max(0, currentStats.validCount - seatsCount),
        });

        void this.loadStats();
      }
    } catch (err) {
      this.loading.set(false);
      this.lastCheckedIn.set(null);
      this.flashState.set('error');
      this.playErrorSound();

      const httpErr = err as HttpErrorResponse;
      const code = httpErr?.error?.error?.code || `HTTP_${httpErr?.status || 400}`;
      const msg =
        httpErr?.error?.error?.message ||
        httpErr?.error?.message ||
        'Không thể xác thực vé. Vui lòng kiểm tra lại mã QR hoặc mã đơn.';
      this.errorCode.set(code);
      this.errorBanner.set(msg);
      this.toast.show(msg, 'error');
    }
  }
}
