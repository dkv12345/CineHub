import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'ch-portal-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div class="text-center">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"
        ></div>
        <p class="mt-3 text-sm text-slate-400">Đang chuyển hướng đến CineHub Portal...</p>
      </div>
    </div>
  `,
})
export class PortalRedirectComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigateByUrl('/portal/login', { replaceUrl: true });
  }
}
