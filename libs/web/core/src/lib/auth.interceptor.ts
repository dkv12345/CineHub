import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  map,
  type Observable,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthStore } from './auth.store';
import { APP_CONFIG } from './config.tokens';

interface RefreshTokenResponse {
  readonly data?: {
    readonly accessToken?: string;
  };
  readonly accessToken?: string;
}

/**
 * Shared in-flight refresh stream so concurrent 401 `TOKEN_EXPIRED` responses
 * trigger at most ONE `PUT /api/v1/auth/refresh-token` call and all waiting
 * requests replay with the newly issued token.
 */
let refresh$: Observable<string> | null = null;

export function resetRefreshStreamForTesting(): void {
  refresh$ = null;
}

/**
 * Pure RxJS coordinator used by `authInterceptor` and unit tests to guarantee
 * single-flight token refresh semantics via `shareReplay` + `finalize`.
 */
export function coordinateTokenRefresh(
  executeRefresh: () => Observable<string>,
  onSuccess: (newToken: string) => void,
  onFailure: () => void,
): Observable<string> {
  if (!refresh$) {
    refresh$ = executeRefresh().pipe(
      tap((newToken) => onSuccess(newToken)),
      catchError((refreshErr) => {
        onFailure();
        return throwError(() => refreshErr);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        refresh$ = null;
      }),
    );
  }
  return refresh$;
}

function isAuthEndpoint(url: string): boolean {
  return /\/auth(\/|$)/.test(url);
}

function isTokenExpiredError(error: HttpErrorResponse): boolean {
  if (error.status !== 401) return false;
  const body = error.error as
    { error?: { code?: string }; code?: string; message?: string } | undefined;
  const code = body?.error?.code ?? body?.code ?? '';
  const message = body?.error?.code ?? body?.message ?? '';
  return (
    code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED' || String(message).includes('TOKEN_EXPIRED')
  );
}

function attachCredentialsAndToken(
  req: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;
  return req.clone({
    headers,
    withCredentials: true,
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStore = inject(AuthStore);
  const httpBackend = inject(HttpBackend);
  const router = inject(Router);
  const config = inject(APP_CONFIG);

  const authorizedReq = attachCredentialsAndToken(req, authStore.accessToken());

  return next(authorizedReq).pipe(
    catchError((err: unknown) => {
      if (
        !(err instanceof HttpErrorResponse) ||
        isAuthEndpoint(req.url) ||
        !isTokenExpiredError(err)
      ) {
        return throwError(() => err);
      }

      const rawHttp = new HttpClient(httpBackend);
      const refreshUrl = `${config.apiBaseUrl}/auth/refresh-token`;

      return coordinateTokenRefresh(
        () =>
          rawHttp.put<RefreshTokenResponse>(refreshUrl, {}, { withCredentials: true }).pipe(
            map((res) => {
              const token = res?.data?.accessToken ?? res?.accessToken;
              if (!token) {
                throw new Error('Refresh response missing accessToken');
              }
              return token;
            }),
          ),
        (newToken) => authStore.updateAccessToken(newToken),
        () => {
          authStore.clearSession();
          void router.navigateByUrl('/auth');
        },
      ).pipe(switchMap((newToken) => next(attachCredentialsAndToken(req, newToken))));
    }),
  );
};
