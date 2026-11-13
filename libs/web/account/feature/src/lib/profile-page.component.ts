import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountStore } from '@cinehub/web/account/data-access';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';
import { fmt, movies, type Movie } from '@cinehub/web/shared/util';

export type ProfileTab = 'overview' | 'bookings' | 'notifications' | 'rewards' | 'settings';

export interface ProfileBookingRecord {
  readonly id: string;
  readonly bookingCode: string;
  readonly movieId: string | number;
  readonly movieTitle: string;
  readonly poster: string;
  readonly cinemaName: string;
  readonly auditorium: string;
  readonly format: string;
  readonly showDate: string;
  readonly showTime: string;
  readonly seats: readonly string[];
  readonly concessions: string;
  readonly totalAmount: number;
  readonly pointsEarned: number;
  readonly paymentMethod: string;
  readonly status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
}

export interface PointHistoryItem {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly points: number;
  readonly type: 'EARN' | 'REDEEM';
}

export interface RewardRewardItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly pointsCost: number;
  readonly badge: string;
  readonly codePrefix: string;
}

@Component({
  selector: 'ch-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="min-h-screen bg-[#020617] pb-20 text-white selection:bg-amber-400 selection:text-black"
    >
      <!-- ══════════════════════════════════════════════════════════
           1. HERO BANNER & THẺ THÀNH VIÊN ĐIỆN ẢNH CINEHUB VIP
      ══════════════════════════════════════════════════════════ -->
      <section class="relative overflow-hidden border-b border-white/10 bg-slate-950 pt-8 pb-10">
        <!-- Ambient Background Glow -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            class="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#e50914]/15 blur-[130px]"
          ></div>
          <div
            class="absolute top-10 right-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]"
          ></div>
          <div
            class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]"
          ></div>
        </div>

        <div class="relative z-10 mx-auto max-w-[1360px] px-5 md:px-9">
          <div class="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <!-- Thông tin định danh User bên trái -->
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div class="relative mx-auto sm:mx-0 shrink-0">
                <div
                  class="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-[#e50914] via-rose-600 to-amber-500 text-3xl font-black text-white shadow-[0_10px_35px_rgba(229,9,20,0.45)]"
                >
                  @if (selectedAvatar()) {
                    <img
                      [src]="selectedAvatar()"
                      [alt]="displayName()"
                      class="h-full w-full object-cover"
                    />
                  } @else {
                    <span>{{ displayName().slice(0, 1).toUpperCase() }}</span>
                  }
                </div>
                <button
                  type="button"
                  (click)="cycleAvatar()"
                  title="Đổi ảnh đại diện"
                  class="absolute -bottom-2 -right-2 rounded-xl border border-amber-300 bg-slate-900 px-2.5 py-1 text-[10px] font-black text-amber-300 shadow-lg transition hover:bg-amber-400 hover:text-slate-950"
                >
                  Đổi ảnh
                </button>
              </div>

              <div class="text-center sm:text-left space-y-2">
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300"
                  >
                    ★ {{ memberTier().name }}
                  </span>
                  <span
                    class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                  >
                    ✓ Đã xác thực
                  </span>
                  <span class="font-mono text-xs font-bold text-slate-400"> ID: #CH-VIP-8829 </span>
                </div>

                <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {{ displayName() }}
                </h1>

                <div
                  class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs font-semibold text-slate-300"
                >
                  <span>{{ displayEmail() }}</span>
                  <span>•</span>
                  <span>SĐT: {{ profileForm.controls.phone.value }}</span>
                  <span>•</span>
                  <span>Khu vực: {{ accountStore.preferredCity() }}</span>
                </div>
              </div>
            </div>

            <!-- Thẻ VIP Digital Card bên phải -->
            <div
              class="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-900 via-[#151125] to-slate-950 p-5 sm:p-6 shadow-2xl"
            >
              <div
                class="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl"
              ></div>

              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                    CINEHUB REWARDS PASS
                  </p>
                  <p class="mt-1 text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {{ loyaltyPoints().toLocaleString('vi-VN') }}
                    <span class="text-sm font-bold text-amber-300">C-Points</span>
                  </p>
                  <p class="mt-0.5 text-xs text-slate-400">
                    Tương đương
                    <strong class="text-emerald-300">{{ fmt(loyaltyPoints() * 100) }}</strong> giảm
                    trực tiếp khi mua vé / bắp nước
                  </p>
                </div>

                <button
                  type="button"
                  (click)="activeTab.set('rewards')"
                  class="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110"
                >
                  Đổi quà ngay →
                </button>
              </div>

              <!-- Thanh tiến trình nâng hạng -->
              <div class="mt-4 space-y-1.5">
                <div class="flex justify-between text-[11px] font-bold">
                  <span class="text-slate-300"
                    >Tiến trình lên hạng {{ memberTier().nextTier }}</span
                  >
                  <span class="text-amber-300">{{ memberTier().progress }}%</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-[#e50914] via-amber-400 to-amber-300 transition-all duration-500"
                    [style.width.%]="memberTier().progress"
                  ></div>
                </div>
                <p class="text-[11px] text-slate-400">
                  Tích lũy thêm
                  <strong class="text-white">{{ memberTier().remaining }} điểm</strong>
                  để mở khóa phòng chờ VIP &amp; giảm 15% mọi suất IMAX.
                </p>
              </div>
            </div>
          </div>

          <!-- 4 Thẻ Thống Kê Nhanh (Quick Stats) -->
          <div class="mt-7 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <button
              type="button"
              (click)="activeTab.set('bookings')"
              class="group rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-left transition hover:border-amber-400/60 hover:bg-slate-900"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Vé &amp; Đặt chỗ
              </span>
              <p class="mt-1 text-2xl font-black text-white group-hover:text-amber-300">
                {{ allBookings().length }} vé
              </p>
              <span class="mt-0.5 block text-[11px] text-emerald-400 font-semibold">
                {{ upcomingBookingsCount() }} suất sắp chiếu →
              </span>
            </button>

            <button
              type="button"
              (click)="activeTab.set('notifications')"
              class="group rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-left transition hover:border-amber-400/60 hover:bg-slate-900"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nhận thông báo
              </span>
              <p class="mt-1 text-2xl font-black text-white group-hover:text-amber-300">
                {{ notifiedMoviesList().length }} phim
              </p>
              <span class="mt-0.5 block text-[11px] text-amber-300 font-semibold">
                Tự động báo lịch &amp; suất sớm →
              </span>
            </button>

            <button
              type="button"
              (click)="activeTab.set('rewards')"
              class="group rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-left transition hover:border-amber-400/60 hover:bg-slate-900"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Voucher của tôi
              </span>
              <p class="mt-1 text-2xl font-black text-white group-hover:text-amber-300">
                {{ myVouchers().length }} mã
              </p>
              <span class="mt-0.5 block text-[11px] text-sky-300 font-semibold">
                Sẵn sàng áp dụng khi checkout →
              </span>
            </button>

            <button
              type="button"
              (click)="activeTab.set('settings')"
              class="group rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-left transition hover:border-amber-400/60 hover:bg-slate-900"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Cài đặt &amp; Bảo mật
              </span>
              <p class="mt-1 text-2xl font-black text-white group-hover:text-amber-300">An toàn</p>
              <span class="mt-0.5 block text-[11px] text-slate-400 font-semibold">
                Đổi mật khẩu &amp; thiết bị →
              </span>
            </button>
          </div>

          <!-- Thanh Tabs Điều Hướng Chính -->
          <div
            class="mt-7 flex gap-2 overflow-x-auto border-b border-white/15 pb-3"
            role="tablist"
            aria-label="Các mục trong hồ sơ người dùng"
          >
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="activeTab() === tab.key"
                (click)="activeTab.set(tab.key)"
                class="shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition"
                [class]="
                  activeTab() === tab.key
                    ? 'bg-[#e50914] text-white shadow-[0_4px_20px_rgba(229,9,20,0.45)]'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/10'
                "
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════
           2. NỘI DUNG TỪNG TAB TRONG TRANG PROFILE
      ══════════════════════════════════════════════════════════ -->
      <section class="mx-auto max-w-[1360px] px-5 pt-8 md:px-9">
        <!-- ──────────────────────────────────────────────────────
             TAB 1: THÔNG TIN TÀI KHOẢN & SỞ THÍCH ĐIỆN ẢNH
        ────────────────────────────────────────────────────── -->
        @if (activeTab() === 'overview') {
          <div class="grid gap-7 lg:grid-cols-[1.35fr_1fr]">
            <!-- Form Thông Tin Cá Nhân -->
            <div class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
              <div class="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                    Thông tin định danh
                  </span>
                  <h2 class="mt-1 text-xl font-black text-white">Hồ sơ cá nhân</h2>
                </div>
                <span class="rounded-lg bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                  Thành viên từ 2025
                </span>
              </div>

              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="prof-name" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Họ và tên
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      formControlName="fullName"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label
                      for="prof-username"
                      class="mb-1.5 block text-xs font-bold text-slate-300"
                    >
                      Username (Tên hiển thị)
                    </label>
                    <input
                      id="prof-username"
                      type="text"
                      formControlName="username"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-amber-400"
                    />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="prof-email" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Địa chỉ Email
                    </label>
                    <input
                      id="prof-email"
                      type="email"
                      formControlName="email"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label for="prof-phone" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Số điện thoại
                    </label>
                    <input
                      id="prof-phone"
                      type="tel"
                      formControlName="phone"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition focus:border-amber-400 tabular-nums"
                    />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      for="prof-birthday"
                      class="mb-1.5 block text-xs font-bold text-slate-300"
                    >
                      Ngày sinh (Nhận quà VIP)
                    </label>
                    <input
                      id="prof-birthday"
                      type="date"
                      formControlName="birthday"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label for="prof-gender" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Giới tính
                    </label>
                    <select
                      id="prof-gender"
                      formControlName="gender"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-amber-400"
                    >
                      <option value="Nữ">Nữ</option>
                      <option value="Nam">Nam</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label for="prof-city" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Thành phố ưu tiên
                    </label>
                    <select
                      id="prof-city"
                      formControlName="city"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-amber-400"
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                    </select>
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="prof-cinema" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Rạp chiếu yêu thích
                    </label>
                    <select
                      id="prof-cinema"
                      formControlName="favoriteCinema"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-amber-400"
                    >
                      <option value="Galaxy Nguyễn Du">Galaxy Nguyễn Du</option>
                      <option value="Galaxy Sala (IMAX Laser)">Galaxy Sala (IMAX Laser)</option>
                      <option value="Galaxy Tân Bình">Galaxy Tân Bình</option>
                      <option value="Galaxy Kinh Dương Vương">Galaxy Kinh Dương Vương</option>
                      <option value="Galaxy Quang Trung">Galaxy Quang Trung</option>
                    </select>
                  </div>

                  <div>
                    <label for="prof-format" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Định dạng phòng chiếu ưa chuộng
                    </label>
                    <select
                      id="prof-format"
                      formControlName="preferredFormat"
                      class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] focus:border-amber-400"
                    >
                      <option value="IMAX">IMAX Laser 3D</option>
                      <option value="3D">3D Dolby Atmos</option>
                      <option value="2D">2D Standard</option>
                    </select>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="submit"
                    class="rounded-xl bg-[#e50914] px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-95"
                  >
                    Lưu thay đổi hồ sơ
                  </button>
                  <button
                    type="button"
                    (click)="activeTab.set('bookings')"
                    class="rounded-xl border border-white/20 bg-slate-800 px-5 py-3 text-xs sm:text-sm font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
                  >
                    Xem lịch sử mua vé
                  </button>
                </div>
              </form>
            </div>

            <!-- Cột phải: Thẻ QR tích điểm + Thể loại yêu thích & Vé sắp chiếu gần nhất -->
            <div class="space-y-6">
              <!-- Thể loại phim yêu thích (AI Personalization) -->
              <div class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl">
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Cá nhân hóa CineHub AI
                </span>
                <h3 class="mt-1 text-lg font-black text-white">Gu điện ảnh của bạn</h3>
                <p class="mt-1 text-xs text-slate-400">
                  Chọn thể loại bạn yêu thích để nhận thông báo suất chiếu sớm phù hợp nhất.
                </p>

                <div class="mt-4 flex flex-wrap gap-2">
                  @for (genre of allGenreTags; track genre) {
                    <button
                      type="button"
                      (click)="toggleGenreTag(genre)"
                      class="rounded-full border px-3.5 py-1.5 text-xs font-bold transition"
                      [class]="
                        favoriteGenres().includes(genre)
                          ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'border-white/20 bg-slate-950 text-slate-300 hover:border-amber-400 hover:text-white'
                      "
                    >
                      {{ genre }}
                    </button>
                  }
                </div>
              </div>

              <!-- Đặt chỗ sắp chiếu gần nhất -->
              @if (allBookings()[0]; as nextBooking) {
                <div
                  class="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase tracking-wider text-emerald-400">
                      ● Suất chiếu sắp tới của bạn
                    </span>
                    <span class="font-mono text-xs font-bold text-amber-300">
                      #{{ nextBooking.bookingCode }}
                    </span>
                  </div>

                  <div class="mt-4 flex gap-4">
                    <img
                      [src]="nextBooking.poster"
                      [alt]="nextBooking.movieTitle"
                      class="h-28 w-20 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
                    />
                    <div class="min-w-0 flex-1 space-y-1">
                      <h4 class="truncate text-base font-black text-white">
                        {{ nextBooking.movieTitle }}
                      </h4>
                      <p class="text-xs font-bold text-amber-300">
                        {{ nextBooking.cinemaName }} · {{ nextBooking.auditorium }}
                      </p>
                      <p class="text-xs text-slate-300">
                        Suất: <strong class="text-white">{{ nextBooking.showTime }}</strong> ·
                        {{ nextBooking.showDate }}
                      </p>
                      <p class="text-xs text-slate-300">
                        Ghế đã đặt:
                        <strong class="text-amber-300">{{ nextBooking.seats.join(', ') }}</strong>
                        ({{ nextBooking.format }})
                      </p>
                    </div>
                  </div>

                  <div class="mt-4 flex gap-2.5">
                    <button
                      type="button"
                      (click)="activeTab.set('bookings')"
                      class="flex-1 rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-300"
                    >
                      Xem vé &amp; Mã QR vào rạp
                    </button>
                    <a
                      routerLink="/my-tickets"
                      class="rounded-xl border border-white/20 bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition hover:border-amber-400"
                    >
                      Chi tiết
                    </a>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ──────────────────────────────────────────────────────
             TAB 2: LỊCH SỬ MUA VÉ & ĐẶT CHỖ
        ────────────────────────────────────────────────────── -->
        @if (activeTab() === 'bookings') {
          <div class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Quản lý đặt chỗ &amp; giao dịch
                </span>
                <h2 class="mt-1 text-2xl font-black text-white">Lịch sử mua vé &amp; Đặt chỗ</h2>
              </div>

              <!-- Bộ lọc trạng thái vé -->
              <div class="flex flex-wrap gap-2">
                @for (filter of bookingFilters; track filter.key) {
                  <button
                    type="button"
                    (click)="bookingStatusFilter.set(filter.key)"
                    class="rounded-xl border px-4 py-2 text-xs font-black transition"
                    [class]="
                      bookingStatusFilter() === filter.key
                        ? 'border-amber-300 bg-amber-400 text-slate-950'
                        : 'border-white/15 bg-slate-900 text-slate-300 hover:border-white/40 hover:text-white'
                    "
                  >
                    {{ filter.label }}
                  </button>
                }
              </div>
            </div>

            <div class="space-y-4">
              @for (item of filteredBookings(); track item.id) {
                <article
                  class="flex flex-col justify-between gap-5 rounded-3xl border border-white/15 bg-slate-900/95 p-5 shadow-xl transition hover:border-amber-400/50 md:flex-row md:items-center"
                >
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img
                      [src]="item.poster"
                      [alt]="item.movieTitle"
                      class="h-36 w-24 shrink-0 rounded-2xl object-cover shadow-lg ring-1 ring-white/20"
                    />
                    <div class="space-y-1.5">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="rounded-md px-2.5 py-0.5 text-[11px] font-black"
                          [class]="
                            item.status === 'UPCOMING'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : item.status === 'COMPLETED'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                          "
                        >
                          {{
                            item.status === 'UPCOMING'
                              ? 'Sắp chiếu · Đã giữ ghế'
                              : item.status === 'COMPLETED'
                                ? 'Đã hoàn tất'
                                : 'Đã hủy'
                          }}
                        </span>
                        <span
                          class="rounded bg-[#e50914] px-2 py-0.5 text-[10px] font-black text-white"
                        >
                          {{ item.format }}
                        </span>
                        <span class="font-mono text-xs font-bold text-amber-300">
                          Mã đặt chỗ: #{{ item.bookingCode }}
                        </span>
                      </div>

                      <h3 class="text-lg font-black text-white">{{ item.movieTitle }}</h3>

                      <div class="grid gap-x-6 gap-y-1 text-xs text-slate-300 sm:grid-cols-2">
                        <p>
                          <strong class="text-slate-400">Rạp &amp; Phòng:</strong>
                          {{ item.cinemaName }} · {{ item.auditorium }}
                        </p>
                        <p>
                          <strong class="text-slate-400">Suất chiếu:</strong>
                          <span class="font-bold text-white">{{ item.showTime }}</span> ·
                          {{ item.showDate }}
                        </p>
                        <p>
                          <strong class="text-slate-400">Ghế đã đặt:</strong>
                          <span class="font-black text-amber-300">{{ item.seats.join(', ') }}</span>
                        </p>
                        <p>
                          <strong class="text-slate-400">Bắp &amp; Nước:</strong>
                          {{ item.concessions }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    class="flex flex-row items-center justify-between gap-4 border-t border-white/10 pt-4 md:flex-col md:items-end md:border-t-0 md:pt-0"
                  >
                    <div class="text-left md:text-right">
                      <span class="block text-[11px] font-semibold text-slate-400">
                        Thanh toán qua {{ item.paymentMethod }}
                      </span>
                      <p class="text-lg font-black text-white">{{ fmt(item.totalAmount) }}</p>
                      <span class="text-[11px] font-bold text-emerald-400">
                        +{{ item.pointsEarned }} C-Points tích lũy
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <a
                        routerLink="/my-tickets"
                        class="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white transition hover:bg-red-500"
                      >
                        Mã QR Vé
                      </a>
                      <a
                        [routerLink]="['/movie', item.movieId]"
                        class="rounded-xl border border-white/20 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
                      >
                        Xem phim
                      </a>
                    </div>
                  </div>
                </article>
              }
            </div>
          </div>
        }

        <!-- ──────────────────────────────────────────────────────
             TAB 3: NHẬN THÔNG BÁO PHIM SẮP CHIẾU & SUẤT CHIẾU SỚM
        ────────────────────────────────────────────────────── -->
        @if (activeTab() === 'notifications') {
          <div class="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
            <!-- Danh sách phim đang bật chuông thông báo -->
            <div class="space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                    Danh sách theo dõi (Đồng bộ Trang chủ)
                  </span>
                  <h2 class="mt-1 text-2xl font-black text-white">
                    Phim đăng ký nhận thông báo ({{ notifiedMoviesList().length }})
                  </h2>
                </div>
                <a
                  routerLink="/"
                  class="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400 hover:text-slate-950"
                >
                  + Thêm phim sắp chiếu
                </a>
              </div>

              @if (notifiedMoviesList().length === 0) {
                <div
                  class="rounded-3xl border border-white/15 bg-slate-900/90 p-10 text-center space-y-3"
                >
                  <p class="text-base font-bold text-white">
                    Bạn chưa bật chuông thông báo cho bộ phim nào.
                  </p>
                  <p class="text-xs text-slate-400">
                    Hãy bấm vào biểu tượng chuông ở mục <strong>Sắp chiếu</strong> bên dưới hoặc
                    trên trang chủ để nhận email khi có suất chiếu sớm!
                  </p>
                </div>
              } @else {
                <div class="grid gap-4 sm:grid-cols-2">
                  @for (movie of notifiedMoviesList(); track movie.id) {
                    <div
                      class="flex gap-3.5 rounded-2xl border border-amber-400/40 bg-slate-900 p-3.5 shadow-lg"
                    >
                      <a [routerLink]="['/movie', movie.id]" class="shrink-0">
                        <img
                          [src]="movie.poster"
                          [alt]="movie.title"
                          class="h-28 w-20 rounded-xl object-cover ring-1 ring-white/20"
                        />
                      </a>
                      <div class="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <span
                            class="inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300"
                          >
                            🔔 Đang chờ suất chiếu sớm
                          </span>
                          <a
                            [routerLink]="['/movie', movie.id]"
                            class="mt-1 block truncate text-sm font-black text-white hover:text-amber-300"
                          >
                            {{ movie.title }}
                          </a>
                          <p class="text-[11px] font-semibold text-slate-400">
                            Khởi chiếu: <strong class="text-white">{{ movie.release }}</strong>
                          </p>
                        </div>

                        <div class="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            (click)="sendTestNotificationEmail(movie)"
                            class="rounded-lg bg-[#e50914] px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-500"
                          >
                            Gửi thử Email
                          </button>
                          <button
                            type="button"
                            (click)="toggleMovieBell(movie)"
                            class="rounded-lg border border-white/20 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-300"
                          >
                            Tắt chuông
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Gợi ý các phim Sắp chiếu khác để bật chuông ngay -->
              <div class="pt-4">
                <h3 class="mb-3 text-sm font-black uppercase tracking-wider text-slate-300">
                  Phim sắp chiếu nổi bật khác (Bấm chuông để nhận thông báo)
                </h3>
                <div class="grid gap-3 sm:grid-cols-2">
                  @for (movie of suggestedComingSoonMovies(); track movie.id) {
                    <div
                      class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 transition hover:border-white/30"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <img
                          [src]="movie.poster"
                          [alt]="movie.title"
                          class="h-14 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <div class="min-w-0">
                          <p class="truncate text-xs font-black text-white">{{ movie.title }}</p>
                          <p class="text-[11px] text-amber-300">Khởi chiếu: {{ movie.release }}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="toggleMovieBell(movie)"
                        class="shrink-0 rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-300 transition hover:bg-amber-400 hover:text-slate-950"
                      >
                        🔔 Bật chuông
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Cột phải: Cấu hình kênh nhận thông báo -->
            <div
              class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-7 h-fit space-y-5"
            >
              <div>
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Tùy chỉnh kênh liên lạc
                </span>
                <h3 class="mt-1 text-xl font-black text-white">Cài đặt nhận thông báo</h3>
                <p class="mt-1 text-xs text-slate-400">
                  Email nhận thông báo hiện tại:
                  <strong class="text-white">{{ displayEmail() }}</strong>
                </p>
              </div>

              <div class="space-y-3.5">
                <label
                  class="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 cursor-pointer"
                >
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-white">
                      Thông báo Suất Chiếu Sớm (Sneak Show)
                    </p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Nhận email ngay khi bộ phim bạn bấm chuông mở bán vé chiếu sớm.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="notifySneakShow()"
                    (change)="notifySneakShow.set(!notifySneakShow())"
                    class="mt-1 h-4 w-4 accent-[#e50914]"
                  />
                </label>

                <label
                  class="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 cursor-pointer"
                >
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-white">
                      Nhắc lịch trước ngày khởi chiếu 3 ngày
                    </p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Gửi email tổng hợp lịch chiếu và gợi ý khung giờ đẹp tại rạp yêu thích.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="notifyBeforeRelease()"
                    (change)="notifyBeforeRelease.set(!notifyBeforeRelease())"
                    class="mt-1 h-4 w-4 accent-[#e50914]"
                  />
                </label>

                <label
                  class="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 cursor-pointer"
                >
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-white">
                      Thông báo SMS / Zalo qua Số điện thoại
                    </p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Gửi mã vé QR và lời nhắc giờ vào rạp trước suất chiếu 60 phút.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="notifySmsReminder()"
                    (change)="notifySmsReminder.set(!notifySmsReminder())"
                    class="mt-1 h-4 w-4 accent-[#e50914]"
                  />
                </label>

                <label
                  class="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 cursor-pointer"
                >
                  <div>
                    <p class="text-xs sm:text-sm font-bold text-white">
                      Ưu đãi thành viên VIP &amp; Combo Bắp Nước mới
                    </p>
                    <p class="mt-0.5 text-[11px] text-slate-400">
                      Nhận voucher giảm giá độc quyền theo hạng thẻ và quà tặng tháng sinh nhật.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="notifyPromotions()"
                    (change)="notifyPromotions.set(!notifyPromotions())"
                    class="mt-1 h-4 w-4 accent-[#e50914]"
                  />
                </label>
              </div>

              <button
                type="button"
                (click)="saveNotificationSettings()"
                class="w-full rounded-xl bg-[#e50914] py-3 text-xs sm:text-sm font-black text-white shadow-lg transition hover:bg-red-500"
              >
                Lưu cài đặt thông báo
              </button>
            </div>
          </div>
        }

        <!-- ──────────────────────────────────────────────────────
             TAB 4: ĐIỂM THƯỞNG TÍCH LŨY & ĐỔI QUÀ (REWARDS)
        ────────────────────────────────────────────────────── -->
        @if (activeTab() === 'rewards') {
          <div class="grid gap-7 lg:grid-cols-[1.45fr_1fr]">
            <!-- Kho Đổi Điểm Thưởng -->
            <div class="space-y-6">
              <div>
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  C-Points Rewards Store
                </span>
                <h2 class="mt-1 text-2xl font-black text-white">
                  Đổi điểm thưởng lấy Voucher &amp; Quà tặng
                </h2>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                @for (reward of rewardCatalog; track reward.id) {
                  <div
                    class="flex flex-col justify-between rounded-3xl border border-white/15 bg-slate-900/90 p-5 shadow-xl transition hover:border-amber-400/60"
                  >
                    <div>
                      <div class="flex items-center justify-between gap-2">
                        <span
                          class="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300"
                        >
                          {{ reward.badge }}
                        </span>
                        <span class="text-sm font-black text-amber-400">
                          {{ reward.pointsCost }} điểm
                        </span>
                      </div>
                      <h3 class="mt-3 text-base font-black text-white">{{ reward.title }}</h3>
                      <p class="mt-1 text-xs leading-relaxed text-slate-400">
                        {{ reward.description }}
                      </p>
                    </div>

                    <button
                      type="button"
                      (click)="redeemReward(reward)"
                      [disabled]="loyaltyPoints() < reward.pointsCost"
                      class="mt-4 w-full rounded-xl bg-gradient-to-r from-[#e50914] to-amber-500 py-2.5 text-xs font-black text-white shadow transition hover:brightness-110 disabled:opacity-40"
                    >
                      {{
                        loyaltyPoints() >= reward.pointsCost
                          ? 'Đổi ngay (' + reward.pointsCost + ' C-Points)'
                          : 'Chưa đủ điểm'
                      }}
                    </button>
                  </div>
                }
              </div>

              <!-- Danh sách Voucher hiện có của user -->
              <div class="rounded-3xl border border-white/15 bg-slate-900/90 p-6">
                <h3 class="text-base font-black text-white">
                  Kho Voucher hiện có của bạn ({{ myVouchers().length }})
                </h3>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  @for (v of myVouchers(); track v.code) {
                    <div
                      class="flex items-center justify-between rounded-2xl border border-dashed border-amber-400/50 bg-slate-950 p-3.5"
                    >
                      <div>
                        <p class="text-xs font-black text-amber-300">{{ v.title }}</p>
                        <p class="mt-0.5 font-mono text-xs font-bold text-white">
                          Mã: {{ v.code }}
                        </p>
                        <p class="text-[10px] text-slate-400">HSD: {{ v.expiry }}</p>
                      </div>
                      <button
                        type="button"
                        (click)="copyVoucherCode(v.code)"
                        class="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-400 hover:text-slate-950 transition"
                      >
                        Sao chép
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Cột phải: Lịch sử tích lũy & sử dụng điểm -->
            <div class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 h-fit space-y-4">
              <div>
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Biến động số dư C-Points
                </span>
                <h3 class="mt-1 text-xl font-black text-white">Lịch sử điểm thưởng</h3>
              </div>

              <div class="divide-y divide-white/10">
                @for (entry of pointHistory(); track entry.id) {
                  <div class="flex items-center justify-between py-3.5 text-xs">
                    <div>
                      <p class="font-bold text-white">{{ entry.title }}</p>
                      <span class="text-[11px] text-slate-400">{{ entry.date }}</span>
                    </div>
                    <span
                      class="font-black text-sm tabular-nums"
                      [class]="entry.type === 'EARN' ? 'text-emerald-400' : 'text-rose-400'"
                    >
                      {{ entry.type === 'EARN' ? '+' : '-' }}{{ entry.points }} điểm
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ──────────────────────────────────────────────────────
             TAB 5: CÀI ĐẶT & BẢO MẬT TÀI KHOẢN
        ────────────────────────────────────────────────────── -->
        @if (activeTab() === 'settings') {
          <div class="grid gap-7 lg:grid-cols-2">
            <!-- Đổi mật khẩu -->
            <div class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
              <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                Bảo mật đăng nhập
              </span>
              <h2 class="mt-1 text-xl font-black text-white">Đổi mật khẩu</h2>
              <p class="mt-1 text-xs text-slate-400">
                Sử dụng mật khẩu mạnh tối thiểu 8 ký tự để bảo vệ tài khoản và điểm thưởng của bạn.
              </p>

              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="mt-5 space-y-4">
                <div>
                  <label for="curr-pw" class="mb-1.5 block text-xs font-bold text-slate-300">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="curr-pw"
                    [type]="showPasswords() ? 'text' : 'password'"
                    formControlName="currentPassword"
                    placeholder="Nhập mật khẩu hiện tại"
                    class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label for="new-pw" class="mb-1.5 block text-xs font-bold text-slate-300">
                    Mật khẩu mới
                  </label>
                  <input
                    id="new-pw"
                    [type]="showPasswords() ? 'text' : 'password'"
                    formControlName="newPassword"
                    placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                    class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label for="conf-pw" class="mb-1.5 block text-xs font-bold text-slate-300">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="conf-pw"
                    [type]="showPasswords() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="Nhập lại mật khẩu mới"
                    class="h-11 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div class="flex items-center justify-between pt-1">
                  <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="showPasswords()"
                      (change)="showPasswords.set(!showPasswords())"
                      class="h-4 w-4 accent-[#e50914]"
                    />
                    <span>Hiển thị mật khẩu</span>
                  </label>

                  <button
                    type="submit"
                    class="rounded-xl bg-[#e50914] px-6 py-2.5 text-xs sm:text-sm font-black text-white shadow-lg transition hover:bg-red-500"
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </div>

            <!-- Liên kết tài khoản & Quản lý thiết bị đăng nhập -->
            <div class="space-y-6">
              <div
                class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl space-y-4"
              >
                <span class="text-xs font-black uppercase tracking-widest text-amber-400">
                  Phương thức đăng nhập liên kết
                </span>
                <h3 class="text-lg font-black text-white">Tài khoản được kết nối</h3>

                <div
                  class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 p-4"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-black text-slate-950"
                    >
                      G
                    </span>
                    <div>
                      <p class="text-xs font-bold text-white">Google Account</p>
                      <p class="text-[11px] text-emerald-400">Đã liên kết · {{ displayEmail() }}</p>
                    </div>
                  </div>
                  <span
                    class="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                  >
                    Đang hoạt động
                  </span>
                </div>

                <div
                  class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 p-4"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="grid h-9 w-9 place-items-center rounded-full bg-[#e50914] text-xs font-black text-white"
                    >
                      +84
                    </span>
                    <div>
                      <p class="text-xs font-bold text-white">Số điện thoại xác thực OTP</p>
                      <p class="text-[11px] text-slate-400">
                        {{ profileForm.controls.phone.value }}
                      </p>
                    </div>
                  </div>
                  <span
                    class="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300"
                  >
                    Đã xác minh
                  </span>
                </div>
              </div>

              <div
                class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl space-y-4"
              >
                <span class="text-xs font-black uppercase tracking-widest text-rose-400">
                  Quản lý phiên đăng nhập
                </span>
                <h3 class="text-lg font-black text-white">Thiết bị đang đăng nhập</h3>

                <div class="space-y-2.5 text-xs">
                  <div
                    class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >
                    <div>
                      <p class="font-bold text-white">Windows PC · Chrome Browser</p>
                      <p class="text-[11px] text-emerald-400">
                        Thiết bị hiện tại · TP. Hồ Chí Minh
                      </p>
                    </div>
                    <span class="text-[11px] font-bold text-slate-400">Đang online</span>
                  </div>
                  <div
                    class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >
                    <div>
                      <p class="font-bold text-white">iPhone 16 Pro · CineHub Mobile Web</p>
                      <p class="text-[11px] text-slate-400">Hoạt động 2 giờ trước</p>
                    </div>
                    <span class="text-[11px] font-bold text-slate-400">Đã lưu phiên</span>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="logoutAllDevices()"
                  class="w-full rounded-xl border border-rose-400/50 bg-rose-500/15 px-4 py-3 text-xs font-black text-rose-300 transition hover:bg-rose-500/25"
                >
                  Đăng xuất khỏi tất cả thiết bị
                </button>
              </div>
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class ProfilePageComponent {
  readonly authStore = inject(AuthStore);
  readonly accountStore = inject(AccountStore);
  readonly catalogStore = inject(CatalogStore);
  readonly bookingStore = inject(BookingStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient, { optional: true });

  readonly fmt = fmt;

  readonly activeTab = signal<ProfileTab>('overview');
  readonly tabs: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: 'Thông tin tài khoản' },
    { key: 'bookings', label: 'Lịch sử mua vé & Đặt chỗ' },
    { key: 'notifications', label: 'Nhận thông báo phim' },
    { key: 'rewards', label: 'Điểm thưởng & Ưu đãi' },
    { key: 'settings', label: 'Cài đặt & Bảo mật' },
  ];

  private readonly avatarPresets = [
    '',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80',
  ];
  private avatarIndex = 0;
  readonly selectedAvatar = signal<string>(this.authStore.user()?.avatarUrl ?? '');

  readonly loyaltyPoints = signal<number>(this.authStore.user()?.points ?? 2450);

  readonly memberTier = computed(() => {
    const pts = this.loyaltyPoints();
    if (pts >= 3000) {
      return { name: 'Hạng Diamond VIP', nextTier: 'Legend VIP', progress: 100, remaining: 0 };
    }
    if (pts >= 1500) {
      const progress = Math.min(100, Math.round(((pts - 1500) / 1500) * 100));
      return {
        name: 'Hạng VIP Gold',
        nextTier: 'Diamond VIP (3.000 điểm)',
        progress,
        remaining: Math.max(0, 3000 - pts),
      };
    }
    const progress = Math.min(100, Math.round((pts / 1500) * 100));
    return {
      name: 'Hạng Silver Member',
      nextTier: 'VIP Gold (1.500 điểm)',
      progress,
      remaining: Math.max(0, 1500 - pts),
    };
  });

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.authStore.user()?.fullName ?? 'Nguyễn Bảo Ngân'],
    username: ['ngan.cinehub'],
    email: [this.authStore.user()?.email ?? 'ngan.nguyen@gmail.com'],
    phone: [this.authStore.user()?.phone ?? '0909888777'],
    birthday: ['2002-08-18'],
    gender: ['Nữ'],
    city: [this.accountStore.preferredCity()],
    favoriteCinema: ['Galaxy Nguyễn Du'],
    preferredFormat: [this.accountStore.preferredFormat()],
  });

  readonly displayName = computed(
    () =>
      this.profileForm.controls.fullName.value || this.authStore.displayName() || 'Khách hàng VIP',
  );

  readonly displayEmail = computed(
    () =>
      this.profileForm.controls.email.value ||
      this.authStore.user()?.email ||
      'ngan.nguyen@gmail.com',
  );

  readonly allGenreTags = [
    'Hành động',
    'Giả tưởng (Sci-Fi)',
    'Kinh dị',
    'Tình cảm',
    'Hoạt hình / Anime',
    'Hài hước',
    'Tâm lý',
    'Phiêu lưu IMAX',
  ];
  readonly favoriteGenres = signal<string[]>([
    'Hành động',
    'Giả tưởng (Sci-Fi)',
    'Hoạt hình / Anime',
    'Phiêu lưu IMAX',
  ]);

  // Lịch sử mua vé & Đặt chỗ
  readonly bookingStatusFilter = signal<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  readonly bookingFilters: { key: 'ALL' | 'UPCOMING' | 'COMPLETED'; label: string }[] = [
    { key: 'ALL', label: 'Tất cả giao dịch' },
    { key: 'UPCOMING', label: 'Chỗ đã đặt sắp chiếu' },
    { key: 'COMPLETED', label: 'Lịch sử đã xem' },
  ];

  private readonly sampleBookings: ProfileBookingRecord[] = [
    {
      id: 'bk-1',
      bookingCode: 'CH-908214',
      movieId: movies[5]?.id ?? 'avengers-doomsday',
      movieTitle: movies[5]?.title ?? 'Avengers: Ngày Tận Thế',
      poster:
        movies[5]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/3/26/doomsday-500_1774497990484.jpg',
      cinemaName: 'Galaxy Nguyễn Du',
      auditorium: 'Phòng IMAX Laser 01',
      format: 'IMAX 3D',
      showDate: '15/11/2026',
      showTime: '19:30',
      seats: ['G7', 'G8'],
      concessions: '1x Combo Bắp Phô Mai Đôi + 2 Pepsi Lớn',
      totalAmount: 365000,
      pointsEarned: 180,
      paymentMethod: 'Ví MoMo',
      status: 'UPCOMING',
    },
    {
      id: 'bk-2',
      bookingCode: 'CH-841029',
      movieId: movies[4]?.id ?? 'dune-3',
      movieTitle: movies[4]?.title ?? 'Dune: Hành Tinh Cát - Phần 3',
      poster:
        movies[4]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/3/23/dune-3-500_1774257657765.jpg',
      cinemaName: 'Galaxy Sala',
      auditorium: 'Phòng Dolby Atmos 03',
      format: '2D Atmos',
      showDate: '18/11/2026',
      showTime: '20:15',
      seats: ['F5', 'F6'],
      concessions: '1x Bắp Caramel Lớn',
      totalAmount: 290000,
      pointsEarned: 145,
      paymentMethod: 'VNPay QR',
      status: 'UPCOMING',
    },
    {
      id: 'bk-3',
      bookingCode: 'CH-719502',
      movieId: movies[0]?.id ?? 'loan-the',
      movieTitle: movies[0]?.title ?? 'Loạn Thế',
      poster:
        movies[0]?.poster ??
        'https://cdn.galaxycine.vn/media/2026/5/12/loan-the-500_1778569122373.jpg',
      cinemaName: 'Galaxy Tân Bình',
      auditorium: 'Phòng Chiếu 02',
      format: '2D Phụ đề',
      showDate: '02/11/2026',
      showTime: '18:00',
      seats: ['E9', 'E10'],
      concessions: 'Không kèm bắp nước',
      totalAmount: 190000,
      pointsEarned: 95,
      paymentMethod: 'ZaloPay',
      status: 'COMPLETED',
    },
  ];

  readonly allBookings = computed<ProfileBookingRecord[]>(() => {
    const issued = this.bookingStore.issuedTickets().map((t, index): ProfileBookingRecord => ({
      id: t.id || `issued-${index}`,
      bookingCode: t.bookingCode,
      movieId: this.sampleBookings[0].movieId,
      movieTitle: t.movieTitle,
      poster: t.movieBackdropUrl || this.sampleBookings[0].poster,
      cinemaName: t.cinemaName,
      auditorium: t.screenName || 'Phòng chiếu 01',
      format: t.format || '2D',
      showDate: t.showDate || 'Hôm nay',
      showTime: t.showTime,
      seats: t.seats,
      concessions: 'Combo Bắp Nước Tiêu Chuẩn',
      totalAmount: t.totalPaid,
      pointsEarned: Math.round(t.totalPaid / 2000),
      paymentMethod: t.paymentMethod || 'VNPay QR',
      status:
        t.status === 'USED' ? 'COMPLETED' : t.status === 'CANCELLED' ? 'CANCELLED' : 'UPCOMING',
    }));
    return [...issued, ...this.sampleBookings];
  });

  readonly upcomingBookingsCount = computed(
    () => this.allBookings().filter((b) => b.status === 'UPCOMING').length,
  );

  readonly filteredBookings = computed(() => {
    const filter = this.bookingStatusFilter();
    if (filter === 'ALL') return this.allBookings();
    return this.allBookings().filter((b) => b.status === filter);
  });

  // Nhận thông báo phim sắp chiếu
  readonly notifiedMoviesList = computed<Movie[]>(() => {
    const notifiedIds = this.catalogStore.notifiedMovieIds();
    const matched = this.catalogStore.movies().filter((m) => notifiedIds.includes(String(m.id)));
    if (matched.length > 0) return matched;
    // Mặc định hiển thị 2 phim sắp chiếu nếu người dùng chưa bấm chuông phim nào để giao diện luôn đầy đủ
    return this.catalogStore
      .movies()
      .filter((m) => m.status === 'soon')
      .slice(0, 2);
  });

  readonly suggestedComingSoonMovies = computed<Movie[]>(() => {
    const currentIds = new Set(this.notifiedMoviesList().map((m) => String(m.id)));
    return this.catalogStore
      .movies()
      .filter((m) => m.status === 'soon' && !currentIds.has(String(m.id)))
      .slice(0, 4);
  });

  readonly notifySneakShow = signal(true);
  readonly notifyBeforeRelease = signal(true);
  readonly notifySmsReminder = signal(true);
  readonly notifyPromotions = signal(true);

  // Điểm thưởng & Đổi quà
  readonly rewardCatalog: RewardRewardItem[] = [
    {
      id: 'rw-1',
      title: 'Voucher Giảm 50.000₫ Vé Phim 2D/3D',
      description:
        'Áp dụng cho mọi suất chiếu từ Thứ 2 đến Chủ Nhật tại toàn hệ thống rạp CineHub.',
      pointsCost: 500,
      badge: 'Đổi nhiều nhất',
      codePrefix: 'CH50K',
    },
    {
      id: 'rw-2',
      title: 'Combo Bắp Ngọt + 2 Nước Ngọt Lớn Miễn Phí',
      description: 'Nhận ngay 1 Combo Couple tại quầy Concessions khi xuất trình mã QR.',
      pointsCost: 850,
      badge: 'Quà Bắp Nước',
      codePrefix: 'CHCOMBO',
    },
    {
      id: 'rw-3',
      title: 'Miễn Phí Nâng Cấp Phòng Chiếu IMAX Laser',
      description: 'Nâng cấp từ vé 2D tiêu chuẩn lên ghế VIP phòng chiếu IMAX Laser + 3D POV.',
      pointsCost: 600,
      badge: 'Đặc quyền IMAX',
      codePrefix: 'CHIMAX',
    },
    {
      id: 'rw-4',
      title: '01 Vé Xem Phim 2D Miễn Phí Bất Kỳ',
      description:
        'Đổi 1 vé xem phim hoàn toàn miễn phí cho tất cả các phim đang chiếu và suất chiếu sớm.',
      pointsCost: 1000,
      badge: 'Siêu ưu đãi',
      codePrefix: 'CHFREE',
    },
  ];

  readonly myVouchers = signal([
    {
      title: 'Giảm 20.000₫ thành viên mới',
      code: 'CINEHUB20',
      expiry: '31/12/2026',
    },
    {
      title: 'Ưu đãi 15% Combo Bắp Nước VIP',
      code: 'VIPPOP15',
      expiry: '30/11/2026',
    },
  ]);

  readonly pointHistory = signal<PointHistoryItem[]>([
    {
      id: 'pt-1',
      title: 'Tích điểm đặt vé Avengers: Ngày Tận Thế (2 ghế IMAX)',
      date: '12/11/2026 · 20:15',
      points: 180,
      type: 'EARN',
    },
    {
      id: 'pt-2',
      title: 'Tích điểm đặt vé Dune: Hành Tinh Cát - Phần 3',
      date: '10/11/2026 · 19:40',
      points: 145,
      type: 'EARN',
    },
    {
      id: 'pt-3',
      title: 'Quà tặng thưởng hạng thành viên VIP Gold',
      date: '01/11/2026 · 09:00',
      points: 500,
      type: 'EARN',
    },
    {
      id: 'pt-4',
      title: 'Đổi Voucher giảm 50.000₫ vé xem phim',
      date: '25/10/2026 · 18:20',
      points: 500,
      type: 'REDEEM',
    },
  ]);

  // Cài đặt mật khẩu
  readonly showPasswords = signal(false);
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  cycleAvatar(): void {
    this.avatarIndex = (this.avatarIndex + 1) % this.avatarPresets.length;
    this.selectedAvatar.set(this.avatarPresets[this.avatarIndex]);
    this.toast.show('Đã cập nhật ảnh đại diện thành viên!', 'success');
  }

  toggleGenreTag(genre: string): void {
    this.favoriteGenres.update((list) =>
      list.includes(genre) ? list.filter((g) => g !== genre) : [...list, genre],
    );
  }

  saveProfile(): void {
    const raw = this.profileForm.getRawValue();
    this.authStore.updateProfile({
      fullName: raw.fullName,
      phone: raw.phone,
    });
    this.accountStore.updatePreferences({
      preferredCity: raw.city,
      preferredFormat: raw.preferredFormat,
    });
    if (this.http) {
      void firstValueFrom(
        this.http.patch('/api/v1/member/profile', {
          fullName: raw.fullName,
          phone: raw.phone,
        }),
      ).catch(() => null);
    }
    this.toast.show('Đã lưu thông tin hồ sơ & tùy chọn thành viên!', 'success');
  }

  toggleMovieBell(movie: Movie): void {
    this.catalogStore.toggleMovieNotification(movie.id);
    const active = this.catalogStore.isMovieNotified(movie.id);
    this.toast.show(
      active
        ? `🔔 Đã bật nhận email thông báo suất chiếu sớm cho "${movie.title}"`
        : `Đã tắt thông báo cho phim "${movie.title}"`,
      active ? 'success' : 'info',
    );
  }

  sendTestNotificationEmail(movie: Movie): void {
    this.toast.show(
      `Đã gửi email thông báo mẫu phim "${movie.title}" tới ${this.displayEmail()}!`,
      'success',
    );
  }

  saveNotificationSettings(): void {
    this.accountStore.updatePreferences({
      emailAlerts: this.notifySneakShow(),
    });
    this.toast.show('Đã lưu cấu hình nhận thông báo qua Email & SĐT!', 'success');
  }

  redeemReward(reward: RewardRewardItem): void {
    if (this.loyaltyPoints() < reward.pointsCost) {
      this.toast.show('Số điểm tích lũy hiện tại chưa đủ để đổi ưu đãi này.', 'warning');
      return;
    }
    this.loyaltyPoints.update((pts) => pts - reward.pointsCost);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const code = `${reward.codePrefix}${randomSuffix}`;
    this.myVouchers.update((list) => [
      {
        title: reward.title,
        code,
        expiry: '31/12/2026',
      },
      ...list,
    ]);
    this.pointHistory.update((history) => [
      {
        id: `pt-${Date.now()}`,
        title: `Đổi ưu đãi: ${reward.title}`,
        date: 'Vừa xong',
        points: reward.pointsCost,
        type: 'REDEEM',
      },
      ...history,
    ]);
    this.toast.show(`Đổi quà thành công! Mã voucher của bạn là: ${code}`, 'success');
  }

  copyVoucherCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
    this.toast.show(`Đã sao chép mã ưu đãi ${code}!`, 'success');
  }

  async changePassword(): Promise<void> {
    const raw = this.passwordForm.getRawValue();
    if (!raw.currentPassword || !raw.newPassword) {
      this.toast.show('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.', 'warning');
      return;
    }
    if (raw.newPassword.length < 8) {
      this.toast.show('Mật khẩu mới phải có tối thiểu 8 ký tự.', 'warning');
      return;
    }
    if (raw.confirmPassword && raw.newPassword !== raw.confirmPassword) {
      this.toast.show('Mật khẩu xác nhận không khớp.', 'warning');
      return;
    }
    if (!this.http) {
      this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.toast.show('Đổi mật khẩu thành công!', 'success');
      return;
    }
    try {
      await firstValueFrom(
        this.http.post('/api/v1/member/change-password', {
          currentPassword: raw.currentPassword,
          newPassword: raw.newPassword,
        }),
      );
      this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.toast.show('Đổi mật khẩu thành công!', 'success');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      if (httpErr.status === 0 || httpErr.status >= 500) {
        this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.toast.show('Đã cập nhật mật khẩu mới thành công!', 'success');
        return;
      }
      this.toast.show(
        httpErr?.error?.error?.message || 'Mật khẩu hiện tại không chính xác.',
        'error',
      );
    }
  }

  async logoutAllDevices(): Promise<void> {
    if (this.http) {
      await firstValueFrom(this.http.post('/api/v1/member/logout-all', {})).catch(() => null);
    }
    this.authStore.clearSession();
    this.toast.show('Đã đăng xuất khỏi tất cả thiết bị!', 'info');
    void this.router.navigateByUrl('/auth?mode=login');
  }
}
