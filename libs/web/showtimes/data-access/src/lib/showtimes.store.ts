import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import {
  filterShowtimes,
  getShowtimeCityName,
  type GalaxySession,
  type ShowtimeFilters,
  vietnamDate,
} from '@cinehub/web/showtimes/util';

export interface ShowtimesState {
  readonly sessions: readonly GalaxySession[];
  readonly filters: ShowtimeFilters;
  readonly loading: boolean;
  readonly error: string | null;
  readonly stale: boolean;
  readonly fetchedAt: string | null;
}

const initialState: ShowtimesState = {
  sessions: [],
  filters: {
    date: null,
    cityId: 'all',
    cinemaId: 'all',
    movieId: 'all',
    format: 'all',
    searchQuery: '',
  },
  loading: false,
  error: null,
  stale: false,
  fetchedAt: null,
};

export const ShowtimesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    days: computed(() =>
      Array.from({ length: 7 }, (_, offset) => {
        const today = vietnamDate();
        const selectedDate = store.filters().date;
        const startDate = selectedDate && selectedDate > vietnamDate(6) ? selectedDate : today;
        const dayDate = new Date(`${startDate}T00:00:00+07:00`);
        dayDate.setUTCDate(dayDate.getUTCDate() + offset);
        const isoDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(dayDate);
        const day = new Date(`${isoDate}T12:00:00+07:00`);
        const matchingSessions = filterShowtimes([...store.sessions()], {
          ...store.filters(),
          date: isoDate,
        });
        return {
          isoDate,
          month: isoDate.slice(5, 7),
          short:
            isoDate === today
              ? 'Hôm nay'
              : new Intl.DateTimeFormat('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  weekday: 'short',
                }).format(day),
          num: isoDate.slice(8, 10),
          count: matchingSessions.length,
        };
      }),
    ),
    cities: computed(() => {
      const map = new Map<string, string>();
      for (const s of store.sessions()) {
        const name = getShowtimeCityName(s);
        const key = name;
        if (key && name !== 'Tỉnh / Thành phố chưa xác định') map.set(key, name);
      }
      return Array.from(map.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }),
    movies: computed(() => {
      const map = new Map<string, { id: string; dbId: string; slug: string; name: string }>();
      for (const s of store.sessions()) {
        const id = s.movie.slug || s.movie.dbId || s.movie.id;
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            dbId: s.movie.dbId || '',
            slug: s.movie.slug || '',
            name: s.movie.name,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }),
    filteredSessions: computed(() => filterShowtimes([...store.sessions()], store.filters())),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      updateFilters(partial: Partial<ShowtimeFilters>): void {
        patchState(store, {
          filters: { ...store.filters(), ...partial },
        });
      },

      resetFilters(): void {
        patchState(store, {
          filters: {
            date: null,
            cityId: 'all',
            cinemaId: 'all',
            movieId: 'all',
            format: 'all',
            searchQuery: '',
          },
        });
      },

      async loadSessionsFromApi(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const res = await firstValueFrom(
            http
              .get<{
                data?: GalaxySession[];
                result?: GalaxySession[];
                stale?: boolean;
                fetchedAt?: string;
              }>('/api/v1/sessions')
              .pipe(timeout(6000)),
          );
          const sessions = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.result)
              ? res.result
              : [];
          patchState(store, {
            sessions,
            loading: false,
            stale: res?.stale ?? false,
            fetchedAt: res?.fetchedAt ?? null,
          });
        } catch (error) {
          const message =
            error instanceof HttpErrorResponse
              ? `Không thể tải lịch chiếu (HTTP ${error.status}). Vui lòng thử lại.`
              : 'Không thể tải lịch chiếu từ máy chủ. Vui lòng thử lại.';
          patchState(store, { loading: false, error: message });
        }
      },
    };
  }),
);
