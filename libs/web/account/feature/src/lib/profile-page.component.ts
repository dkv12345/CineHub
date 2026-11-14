import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccountStore } from '@cinehub/web/account/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';

type ProfileTab = 'info' | 'security' | 'policy';
type PolicyKey = 'privacy' | 'payment' | 'terms';

@Component({
  selector: 'ch-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <!-- Page Header -->
      <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300"
          >
            Hồ sơ cá nhân
          </span>
          <h1 class="mt-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Tài khoản thành viên CineHub
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Quản lý thông tin cá nhân, bảo mật tài khoản, tùy chọn xem phim và chính sách bảo mật.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <a
            routerLink="/my-tickets"
            class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:border-amber-400/50 hover:bg-white/10"
          >
            <span>🎟️</span>
            <span>Vé của tôi</span>
          </a>
          @if (authStore.user()?.role === 'STAFF' || authStore.user()?.role === 'ADMIN') {
            <a
              routerLink="/portal/staff"
              class="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <span>📷</span>
              <span>Cổng soát vé QR</span>
            </a>
          }
        </div>
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <!-- Left Column: Membership Card & Quick Info -->
        <aside class="space-y-5 lg:col-span-4">
          <div
            class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl"
          >
            <!-- Top Accent Banner -->
            <div
              class="h-20 bg-gradient-to-r from-[#e50914]/80 via-rose-600/60 to-amber-500/70"
            ></div>

            <div class="px-6 pb-6">
              <!-- Avatar -->
              <div class="-mt-10 flex items-end justify-between gap-3">
                <div
                  class="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-slate-900 bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-black text-slate-950 shadow-xl"
                >
                  {{ ((authStore.user()?.fullName || 'K')[0] || 'K').toUpperCase() }}
                </div>
                <span
                  class="rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-300"
                >
                  {{ authStore.user()?.role ?? 'CUSTOMER' }}
                </span>
              </div>

              <div class="mt-4">
                <h2 class="text-lg font-black text-white">
                  {{ authStore.user()?.fullName ?? 'Thành viên CineHub' }}
                </h2>
                <p class="mt-0.5 truncate text-xs text-slate-400">
                  {{ authStore.user()?.email ?? 'member@cinehub.vn' }}
                </p>
              </div>

              <!-- Loyalty Points -->
              <div
                class="mt-5 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-red-500/10 p-4"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300">Điểm thưởng tích lũy</span>
                  <span class="text-xs font-bold text-emerald-400">Thành viên</span>
                </div>
                <div class="mt-1 flex items-baseline gap-1.5">
                  <span class="text-2xl font-black text-amber-300">
                    {{ (authStore.user()?.points ?? 1850).toLocaleString('vi-VN') }}
                  </span>
                  <span class="text-xs font-bold text-amber-300/80">điểm</span>
                </div>
              </div>

              <!-- Preferences Summary -->
              <div class="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Số điện thoại</span>
                  <span class="font-bold text-white">
                    {{ authStore.user()?.phone || 'Chưa cập nhật' }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Khu vực ưu tiên</span>
                  <span class="font-bold text-white">{{ accountStore.preferredCity() }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Định dạng ưa chuộng</span>
                  <span
                    class="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-black text-amber-300"
                  >
                    {{ accountStore.preferredFormat() }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Thông báo Email</span>
                  <span
                    class="font-bold"
                    [class.text-emerald-400]="accountStore.emailAlerts()"
                    [class.text-slate-500]="!accountStore.emailAlerts()"
                  >
                    {{ accountStore.emailAlerts() ? 'Đang bật' : 'Đang tắt' }}
                  </span>
                </div>
              </div>

              <!-- Logout All Devices -->
              <div class="mt-6 border-t border-white/10 pt-5">
                <button
                  type="button"
                  (click)="logoutAllDevices()"
                  class="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                >
                  Đăng xuất khỏi mọi thiết bị
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Right Column: Tabs + Content -->
        <section class="space-y-6 lg:col-span-8">
          <!-- Tab Navigation -->
          <div
            class="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-1.5 backdrop-blur-xl"
          >
            <button
              type="button"
              (click)="activeTab.set('info')"
              class="flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm"
              [class]="
                activeTab() === 'info'
                  ? 'bg-gradient-to-r from-[#e50914] to-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              "
            >
              Thông tin cá nhân
            </button>
            <button
              type="button"
              (click)="activeTab.set('security')"
              class="flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm"
              [class]="
                activeTab() === 'security'
                  ? 'bg-gradient-to-r from-[#e50914] to-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              "
            >
              Bảo mật & Mật khẩu
            </button>
            <button
              type="button"
              (click)="activeTab.set('policy')"
              class="flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm"
              [class]="
                activeTab() === 'policy'
                  ? 'bg-gradient-to-r from-[#e50914] to-amber-500 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              "
            >
              Cài đặt & Chính sách
            </button>
          </div>

          <!-- TAB 1: Profile Info & Preferences -->
          @if (activeTab() === 'info') {
            <div
              class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
            >
              <div class="mb-6 border-b border-white/10 pb-4">
                <span class="text-[11px] font-black uppercase tracking-widest text-amber-300">
                  Cập nhật hồ sơ
                </span>
                <h2 class="mt-1 text-xl font-black text-white">Thông tin liên hệ & Sở thích</h2>
                <p class="mt-1 text-xs text-slate-400">
                  Thông tin này được dùng để gửi vé điện tử QR và gợi ý suất chiếu phù hợp.
                </p>
              </div>

              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-5">
                <div class="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label for="prof-name" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Họ và tên
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      formControlName="fullName"
                      placeholder="Nhập họ và tên"
                      class="w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
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
                      placeholder="Nhập số điện thoại"
                      class="w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-bold text-slate-300">
                    Email tài khoản
                  </label>
                  <div
                    class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300"
                  >
                    <span>{{ authStore.user()?.email ?? 'member@cinehub.vn' }}</span>
                    <span
                      class="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300"
                    >
                      Đã xác thực
                    </span>
                  </div>
                </div>

                <div class="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label for="prof-city" class="mb-1.5 block text-xs font-bold text-slate-300">
                      Khu vực rạp ưu tiên
                    </label>
                    <select
                      id="prof-city"
                      [value]="accountStore.preferredCity()"
                      (change)="onCityChange($event)"
                      class="w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                    </select>
                  </div>

                  <div>
                    <span class="mb-1.5 block text-xs font-bold text-slate-300">
                      Định dạng phim ưa chuộng
                    </span>
                    <div class="grid grid-cols-3 gap-2">
                      @for (fmt of ['2D', '3D', 'IMAX']; track fmt) {
                        <button
                          type="button"
                          (click)="selectFormat(fmt)"
                          class="rounded-xl border py-2.5 text-xs font-black transition"
                          [class]="
                            accountStore.preferredFormat() === fmt
                              ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                              : 'border-white/15 bg-slate-950/60 text-slate-400 hover:border-white/30 hover:text-white'
                          "
                        >
                          {{ fmt }}
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <div
                  class="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-5"
                >
                  <button
                    type="submit"
                    class="rounded-xl bg-gradient-to-r from-[#e50914] to-amber-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-900/40 transition hover:brightness-110"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- TAB 2: Security & Password -->
          @if (activeTab() === 'security') {
            <div
              class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
            >
              <div class="mb-6 border-b border-white/10 pb-4">
                <span class="text-[11px] font-black uppercase tracking-widest text-amber-300">
                  Bảo mật tài khoản
                </span>
                <h2 class="mt-1 text-xl font-black text-white">Đổi mật khẩu</h2>
                <p class="mt-1 text-xs text-slate-400">
                  Nên sử dụng mật khẩu tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số để bảo vệ tài
                  khoản.
                </p>
              </div>

              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-5">
                <div>
                  <label for="curr-pw" class="mb-1.5 block text-xs font-bold text-slate-300">
                    Mật khẩu hiện tại
                  </label>
                  <div class="relative">
                    <input
                      id="curr-pw"
                      [type]="showCurrentPw() ? 'text' : 'password'"
                      formControlName="currentPassword"
                      placeholder="Nhập mật khẩu hiện tại"
                      class="w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 pr-16 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                    <button
                      type="button"
                      (click)="showCurrentPw.set(!showCurrentPw())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-white"
                    >
                      {{ showCurrentPw() ? 'ẨN' : 'HIỆN' }}
                    </button>
                  </div>
                </div>

                <div>
                  <label for="new-pw" class="mb-1.5 block text-xs font-bold text-slate-300">
                    Mật khẩu mới
                  </label>
                  <div class="relative">
                    <input
                      id="new-pw"
                      [type]="showNewPw() ? 'text' : 'password'"
                      formControlName="newPassword"
                      placeholder="Nhập mật khẩu mới"
                      class="w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 pr-16 text-sm text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                    <button
                      type="button"
                      (click)="showNewPw.set(!showNewPw())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-white"
                    >
                      {{ showNewPw() ? 'ẨN' : 'HIỆN' }}
                    </button>
                  </div>
                </div>

                <div
                  class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"
                >
                  <p class="text-xs text-slate-400">
                    Xác thực OTP Email đang được kích hoạt cho tài khoản này.
                  </p>
                  <button
                    type="submit"
                    class="rounded-xl bg-gradient-to-r from-[#e50914] to-amber-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-900/40 transition hover:brightness-110"
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- TAB 3: Settings & Policies -->
          @if (activeTab() === 'policy') {
            <div class="space-y-6">
              <!-- Privacy & Notification Settings -->
              <div
                class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
              >
                <div class="mb-5 border-b border-white/10 pb-4">
                  <span class="text-[11px] font-black uppercase tracking-widest text-amber-300">
                    Tùy chọn cá nhân
                  </span>
                  <h2 class="mt-1 text-xl font-black text-white">
                    Cài đặt thông báo & Quyền riêng tư
                  </h2>
                </div>

                <div class="space-y-4">
                  <div
                    class="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <div>
                      <div class="text-sm font-bold text-white">
                        Gửi vé điện tử & mã QR qua Email
                      </div>
                      <p class="mt-0.5 text-xs text-slate-400">
                        Tự động gửi hóa đơn thanh toán và vé QR về email sau khi giao dịch thành
                        công.
                      </p>
                    </div>
                    <span
                      class="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300"
                    >
                      Luôn bật
                    </span>
                  </div>

                  <div
                    class="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <div>
                      <div class="text-sm font-bold text-white">Thông báo phim mới & ưu đãi</div>
                      <p class="mt-0.5 text-xs text-slate-400">
                        Nhận thông báo lịch chiếu sớm, mã giảm giá và ưu đãi thành viên CineHub.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      [attr.aria-checked]="accountStore.emailAlerts()"
                      (click)="toggleEmailAlerts()"
                      class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition"
                      [class]="accountStore.emailAlerts() ? 'bg-amber-500' : 'bg-slate-700'"
                    >
                      <span
                        class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition"
                        [class]="accountStore.emailAlerts() ? 'translate-x-6' : 'translate-x-1'"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Policies Accordion -->
              <div
                class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
              >
                <div class="mb-5 border-b border-white/10 pb-4">
                  <span class="text-[11px] font-black uppercase tracking-widest text-amber-300">
                    Chính sách CineHub
                  </span>
                  <h2 class="mt-1 text-xl font-black text-white">
                    Chính sách bảo mật & Điều khoản sử dụng
                  </h2>
                </div>

                <div class="space-y-3">
                  <!-- Privacy Policy -->
                  <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                    <button
                      type="button"
                      (click)="togglePolicy('privacy')"
                      class="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-bold text-white transition hover:bg-white/5"
                    >
                      <span>1. Chính sách bảo mật thông tin (Privacy Policy)</span>
                      <span class="text-amber-300">
                        {{ expandedPolicy() === 'privacy' ? '−' : '+' }}
                      </span>
                    </button>
                    @if (expandedPolicy() === 'privacy') {
                      <div
                        class="border-t border-white/10 px-4 py-3.5 text-xs leading-relaxed text-slate-300 space-y-2"
                      >
                        <p>
                          CineHub cam kết bảo vệ tuyệt đối dữ liệu cá nhân của khách hàng bao gồm họ
                          tên, email, số điện thoại và lịch sử đặt vé.
                        </p>
                        <p>
                          Mật khẩu được băm bảo mật một chiều; phiên đăng nhập sử dụng JWT kết hợp
                          Refresh Token và có thể thu hồi ngay lập tức qua tính năng
                          <strong>Đăng xuất khỏi mọi thiết bị</strong>.
                        </p>
                        <p>
                          Chúng tôi không chia sẻ thông tin cá nhân cho bên thứ ba ngoại trừ cổng
                          thanh toán được bạn lựa chọn khi hoàn tất giao dịch.
                        </p>
                      </div>
                    }
                  </div>

                  <!-- Payment & Ticket Policy -->
                  <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                    <button
                      type="button"
                      (click)="togglePolicy('payment')"
                      class="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-bold text-white transition hover:bg-white/5"
                    >
                      <span>2. Chính sách đặt vé, giữ ghế & thanh toán</span>
                      <span class="text-amber-300">
                        {{ expandedPolicy() === 'payment' ? '−' : '+' }}
                      </span>
                    </button>
                    @if (expandedPolicy() === 'payment') {
                      <div
                        class="border-t border-white/10 px-4 py-3.5 text-xs leading-relaxed text-slate-300 space-y-2"
                      >
                        <p>
                          Ghế bạn chọn được hệ thống giữ tạm tối đa <strong>15 phút</strong> để hoàn
                          tất thanh toán qua VNPay, ZaloPay hoặc Ví MoMo.
                        </p>
                        <p>
                          Ngay sau khi thanh toán thành công, vé điện tử kèm mã QR sẽ được lưu trong
                          mục
                          <strong>Vé của tôi</strong> và gửi tự động về địa chỉ email đã đăng ký.
                        </p>
                        <p>
                          Vé đã thanh toán thành công không hỗ trợ hoàn/hủy sau giờ chiếu; vui lòng
                          kiểm tra kỹ rạp, suất chiếu và vị trí ghế trước khi xác nhận.
                        </p>
                      </div>
                    }
                  </div>

                  <!-- Terms of Use -->
                  <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                    <button
                      type="button"
                      (click)="togglePolicy('terms')"
                      class="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-bold text-white transition hover:bg-white/5"
                    >
                      <span>3. Điều khoản sử dụng & Quy định tại rạp</span>
                      <span class="text-amber-300">
                        {{ expandedPolicy() === 'terms' ? '−' : '+' }}
                      </span>
                    </button>
                    @if (expandedPolicy() === 'terms') {
                      <div
                        class="border-t border-white/10 px-4 py-3.5 text-xs leading-relaxed text-slate-300 space-y-2"
                      >
                        <p>
                          Mỗi mã QR trên vé chỉ có hiệu lực cho một lần quét check-in tại quầy soát
                          vé trước giờ chiếu phim.
                        </p>
                        <p>
                          Khách hàng vui lòng bảo mật mã QR vé điện tử, không chia sẻ công khai để
                          tránh bị người khác sử dụng trước khi vào rạp.
                        </p>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export class ProfilePageComponent {
  readonly authStore = inject(AuthStore);
  readonly accountStore = inject(AccountStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient, { optional: true });

  readonly activeTab = signal<ProfileTab>('info');
  readonly expandedPolicy = signal<PolicyKey | null>('privacy');
  readonly showCurrentPw = signal(false);
  readonly showNewPw = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.authStore.user()?.fullName ?? 'Đỗ Khánh Vi'],
    phone: [this.authStore.user()?.phone ?? '0909123456'],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: [''],
    newPassword: [''],
  });

  onCityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.accountStore.updatePreferences({ preferredCity: value });
  }

  selectFormat(format: string): void {
    if (format === '2D' || format === '3D' || format === 'IMAX') {
      this.accountStore.updatePreferences({ preferredFormat: format });
    }
  }

  toggleEmailAlerts(): void {
    const next = !this.accountStore.emailAlerts();
    this.accountStore.updatePreferences({ emailAlerts: next });
    this.toast.show(
      next ? 'Đã bật thông báo phim mới & ưu đãi qua email.' : 'Đã tắt thông báo ưu đãi qua email.',
      'info',
    );
  }

  togglePolicy(key: PolicyKey): void {
    this.expandedPolicy.set(this.expandedPolicy() === key ? null : key);
  }

  saveProfile(): void {
    const raw = this.profileForm.getRawValue();
    this.authStore.updateProfile({
      fullName: raw.fullName,
      phone: raw.phone,
    });
    if (this.http) {
      void firstValueFrom(
        this.http.patch('/api/v1/member/profile', {
          fullName: raw.fullName,
          phone: raw.phone,
        }),
      ).catch(() => null);
    }
    this.toast.show('Đã lưu thông tin hồ sơ thành công!', 'success');
  }

  async changePassword(): Promise<void> {
    const raw = this.passwordForm.getRawValue();
    if (!raw.currentPassword || !raw.newPassword) {
      this.toast.show('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.', 'warning');
      return;
    }
    if (!this.http) return;
    try {
      await firstValueFrom(
        this.http.post('/api/v1/member/change-password', {
          currentPassword: raw.currentPassword,
          newPassword: raw.newPassword,
        }),
      );
      this.passwordForm.reset({ currentPassword: '', newPassword: '' });
      this.toast.show('Đổi mật khẩu thành công!', 'success');
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
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
