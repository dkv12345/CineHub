import type { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const requestIdInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  if (req.headers.has('X-Request-Id')) {
    return next(req);
  }
  const cloned = req.clone({
    headers: req.headers.set('X-Request-Id', generateCorrelationId()),
  });
  return next(cloned);
};
