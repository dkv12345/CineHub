import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.';
    if (message && !message.includes('NG0')) {
      this.toast.show(message, 'error');
    }
  }
}
