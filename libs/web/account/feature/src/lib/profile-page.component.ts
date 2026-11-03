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
    <section class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 class="mb-6 text-2xl font-black text-white sm:text-3xl">Hồ sơ thành viên CineHub</h1>

      <div class="grid gap-6 md:grid-cols-12">
        <div class="md:col-span-5 rounded-2xl border border-amber-500/30 bg-slate-900/90 p-6">
          <div class="flex items-center gap-4">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-2xl font-black text-slate-950"
            >
              {{ (authStore.user()?.fullName ?? 'K')[0] }}
            </div>
            <div>
              <div class="text-lg font-extrabold text-white">
                {{ authStore.user()?.fullName ?? 'Khách hàng VIP' }}
              </div>
              <div class="text-xs text-slate-400">
                {{ authStore.user()?.email ?? 'khach@cinehub.vn' }}
              </div>
              <span
                class="mt-1.5 inline-block rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300"
              >
                {{ authStore.user()?.tier ?? 'Gold VIP' }} ·
                {{ authStore.user()?.points ?? 1850 }} điểm
              </span>
            </div>
          </div>

          <div class="mt-6 space-y-2 border-t border-slate-800 pt-4 text-xs">
            <div class="flex justify-between text-slate-300">
              <span>Thành phố ưu tiên:</span>
              <strong class="text-amber-300">{{ accountStore.preferredCity() }}</strong>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Định dạng yêu thích:</span>
              <strong class="text-amber-300">{{ accountStore.preferredFormat() }}</strong>
            </div>
          </div>
        </div>

        <div class="md:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/85 p-6">
          <h2 class="text-base font-bold text-white">Cập nhật thông tin cá nhân</h2>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="mt-4 space-y-4">
            <div>
              <label for="prof-name" class="block text-xs font-semibold text-slate-300">
                Họ và tên
              </label>
              <input
                id="prof-name"
                type="text"
                formControlName="fullName"
                class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label for="prof-phone" class="block text-xs font-semibold text-slate-300">
                Số điện thoại
              </label>
              <input
                id="prof-phone"
                type="tel"
                formControlName="phone"
                class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button
                type="submit"
                class="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
              >
                Lưu thay đổi
              </button>
              <a
                routerLink="/my-tickets"
                class="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-amber-400"
              >
                Lịch sử đặt vé
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
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
