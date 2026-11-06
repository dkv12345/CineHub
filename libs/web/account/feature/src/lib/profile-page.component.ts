import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountStore } from '@cinehub/web/account/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';

@Component({
  selector: 'ch-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-container max-w-4xl py-8 sm:py-12">
      <div class="mb-6 space-y-1">
        <span class="cinema-eyebrow">Hồ sơ cá nhân</span>
        <h1 class="cinema-heading-section text-[var(--color-text-primary)]">
          Tài khoản thành viên CineHub
        </h1>
        <p class="cinema-metadata text-xs">
          Quản lý thông tin định danh, điểm tích lũy và sở thích xem phim.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-12 md:gap-8 items-start">
        <!-- Membership Card Panel -->
        <div class="cinema-panel-raised p-6 md:col-span-5 space-y-6 shadow-xs">
          <div class="flex items-center gap-4">
            <!-- Monogram Avatar -->
            <div
              class="flex h-14 w-14 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] text-xl font-semibold text-[#fffdf9] shadow-xs"
            >
              {{ (authStore.user()?.fullName ?? 'K')[0] }}
            </div>
            <div>
              <div class="cinema-card-title text-[var(--color-text-primary)]">
                {{ authStore.user()?.fullName ?? 'Khách hàng VIP' }}
              </div>
              <div class="text-xs text-[var(--color-text-secondary)]">
                {{ authStore.user()?.email ?? 'khach@cinehub.vn' }}
              </div>
              <span
                class="mt-1.5 inline-block rounded-[3px] border border-[var(--color-brand-primary)] bg-[var(--color-brand-subtle)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-brand-primary)]"
              >
                {{ authStore.user()?.tier ?? 'Gold VIP' }} ·
                {{ authStore.user()?.points ?? 1850 }} điểm thưởng
              </span>
            </div>
          </div>

          <div
            class="space-y-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-secondary)]"
          >
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Khu vực ưu tiên:</span>
              <strong class="text-[var(--color-text-primary)]">{{
                accountStore.preferredCity()
              }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-secondary)]">Định dạng ưa chuộng:</span>
              <strong class="text-[var(--color-text-primary)]">{{
                accountStore.preferredFormat()
              }}</strong>
            </div>
          </div>
        </div>

        <!-- Update Info Panel -->
        <div class="cinema-panel p-6 md:col-span-7 space-y-4 shadow-xs">
          <div>
            <span class="cinema-eyebrow">Cập nhật hồ sơ</span>
            <h2 class="cinema-card-title text-[var(--color-text-primary)]">Thông tin liên hệ</h2>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
            <div>
              <label for="prof-name" class="cinema-label">Họ và tên</label>
              <input id="prof-name" type="text" formControlName="fullName" class="cinema-input" />
            </div>

            <div>
              <label for="prof-phone" class="cinema-label">Số điện thoại</label>
              <input id="prof-phone" type="tel" formControlName="phone" class="cinema-input" />
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button type="submit" class="cinema-btn-primary font-bold">Lưu thay đổi</button>
              <a routerLink="/my-tickets" class="cinema-btn-secondary font-semibold">
                Lịch sử đặt vé
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfilePageComponent {
  readonly authStore = inject(AuthStore);
  readonly accountStore = inject(AccountStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [this.authStore.user()?.fullName ?? 'Đỗ Khánh Vi'],
    phone: [this.authStore.user()?.phone ?? '0909123456'],
  });

  saveProfile(): void {
    const raw = this.profileForm.getRawValue();
    this.authStore.updateProfile({
      fullName: raw.fullName,
      phone: raw.phone,
    });
    this.toast.show('Đã lưu thông tin hồ sơ thành công!', 'success');
  }
}
