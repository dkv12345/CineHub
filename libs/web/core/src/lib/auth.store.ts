import { computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly phone?: string | null;
  readonly avatarUrl?: string | null;
  readonly role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  readonly status?: 'ACTIVE' | 'LOCKED' | 'DELETED';
  readonly emailVerified?: boolean;
  readonly points?: number;
  readonly tier?: string;
}

export interface AuthState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly loading: boolean;
}

const STORAGE_TOKEN_KEY = 'cinehub_access_token';
const STORAGE_USER_KEY = 'cinehub_user';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  loading: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => Boolean(store.accessToken() && store.user())),
    isAdmin: computed(() => store.user()?.role === 'ADMIN'),
    displayName: computed(() => store.user()?.fullName ?? 'Khách'),
  })),
  withMethods((store) => {
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);

    return {
      hydrateFromStorage(): void {
        if (!isBrowser) return;
        try {
          const token = localStorage.getItem(STORAGE_TOKEN_KEY);
          const rawUser = localStorage.getItem(STORAGE_USER_KEY);
          const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
          if (token && user) {
            patchState(store, { accessToken: token, user });
          }
        } catch {
          patchState(store, { accessToken: null, user: null });
        }
      },

      setSession(accessToken: string, user: AuthUser): void {
        patchState(store, { accessToken, user, loading: false });
        if (isBrowser) {
          localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        }
      },

      updateAccessToken(accessToken: string): void {
        patchState(store, { accessToken });
        if (isBrowser) {
          localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
        }
      },

      updateProfile(partial: Partial<AuthUser>): void {
        const current = store.user();
        if (!current) return;
        const updated: AuthUser = { ...current, ...partial };
        patchState(store, { user: updated });
        if (isBrowser) {
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
        }
      },

      clearSession(): void {
        patchState(store, { accessToken: null, user: null, loading: false });
        if (isBrowser) {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_USER_KEY);
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.hydrateFromStorage();
    },
  }),
);
