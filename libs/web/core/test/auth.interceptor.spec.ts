import { firstValueFrom, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { coordinateTokenRefresh, resetRefreshStreamForTesting } from '../src/lib/auth.interceptor';

describe('coordinateTokenRefresh (single shared refresh$ stream)', () => {
  beforeEach(() => {
    resetRefreshStreamForTesting();
  });

  it('triggers PUT /api/v1/auth/refresh-token ONLY ONCE for concurrent 401 TOKEN_EXPIRED requests and replays all subscribers', async () => {
    const refreshSubject = new Subject<string>();
    const executeRefresh = vi.fn(() => refreshSubject.asObservable());
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    // 3 concurrent requests fail with 401 TOKEN_EXPIRED simultaneously
    const p1 = firstValueFrom(coordinateTokenRefresh(executeRefresh, onSuccess, onFailure));
    const p2 = firstValueFrom(coordinateTokenRefresh(executeRefresh, onSuccess, onFailure));
    const p3 = firstValueFrom(coordinateTokenRefresh(executeRefresh, onSuccess, onFailure));

    expect(executeRefresh).toHaveBeenCalledTimes(1);

    refreshSubject.next('new-jwt-access-token');
    refreshSubject.complete();

    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
    expect(t1).toBe('new-jwt-access-token');
    expect(t2).toBe('new-jwt-access-token');
    expect(t3).toBe('new-jwt-access-token');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('new-jwt-access-token');
    expect(onFailure).not.toHaveBeenCalled();

    // Subsequent 401 after finalize starts a fresh refresh cycle
    const nextSubject = new Subject<string>();
    const nextExecute = vi.fn(() => nextSubject.asObservable());
    const p4 = firstValueFrom(coordinateTokenRefresh(nextExecute, onSuccess, onFailure));
    nextSubject.next('second-jwt-token');
    nextSubject.complete();
    expect(await p4).toBe('second-jwt-token');
    expect(nextExecute).toHaveBeenCalledTimes(1);
  });

  it('invokes onFailure (clears session and redirects) when refresh fails', async () => {
    const executeRefresh = vi.fn(() => throwError(() => new Error('Refresh cookie expired')));
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    await expect(
      firstValueFrom(coordinateTokenRefresh(executeRefresh, onSuccess, onFailure)),
    ).rejects.toThrow('Refresh cookie expired');

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
