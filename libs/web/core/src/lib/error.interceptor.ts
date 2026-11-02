import {
  HttpErrorResponse,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

const ERROR_CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  SEAT_TAKEN: 'Ghế vừa có người khác giữ chỗ. Vui lòng chọn ghế khác.',
  BOOKING_EXPIRED: 'Thời gian giữ ghế đã hết hạn (15 phút).',
  CONFLICT: 'Dữ liệu bị xung đột. Vui lòng thử lại.',
  INTERNAL: 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.',
};

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status !== 401) {
        const body = err.error as
          { error?: { code?: string; message?: string }; message?: string } | undefined;
        const code = body?.error?.code ?? '';
        const serverMessage = body?.error?.message ?? body?.message;
        const friendlyMessage =
          serverMessage || ERROR_CODE_MESSAGES[code] || 'Không thể kết nối máy chủ.';
        toast.show(friendlyMessage, 'error');
      }
      return throwError(() => err);
    }),
  );
};
