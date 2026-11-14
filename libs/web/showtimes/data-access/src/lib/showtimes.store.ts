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
    days: computed(() => {
      const today = vietnamDate();
      // Filter sessions by current filters EXCEPT date to get counts per date
      const matchingSessions = filterShowtimes([...store.sessions()], {
        ...store.filters(),
        date: null,
      });

      // Group matching sessions by showDate (YYYY-MM-DD)
      const counts = new Map<string, number>();
      for (const session of matchingSessions) {
        const d = session.showDate.slice(0, 10);
        if (d >= today) {
          counts.set(d, (counts.get(d) ?? 0) + 1);
        }
      }

      // If user selected a specific date in the future that has sessions
      const selectedDate = store.filters().date;
      if (selectedDate && !counts.has(selectedDate) && selectedDate >= today) {
        counts.set(selectedDate, 0);
      }

      // If no sessions exist >= today, but sessions exist overall (e.g. all upcoming or past)
      if (counts.size === 0 && matchingSessions.length > 0) {
        for (const session of matchingSessions) {
          const d = session.showDate.slice(0, 10);
          counts.set(d, (counts.get(d) ?? 0) + 1);
        }
      }

      // If there are still no sessions, generate next 7 days from today
      if (counts.size === 0) {
        return Array.from({ length: 7 }, (_, offset) => {
          const dayDate = new Date(`${today}T00:00:00+07:00`);
          dayDate.setUTCDate(dayDate.getUTCDate() + offset);
          const isoDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(dayDate);
          const day = new Date(`${isoDate}T12:00:00+07:00`);
          return {
            isoDate,
            month: isoDate.slice(5, 7),
            short:
              isoDate === today
                ? 'Hôm nay'
                : new Intl.DateTimeFormat('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    weekday: 'short',
                  })
                    .format(day)
                    .replace(/\.$/, ''),
            num: isoDate.slice(8, 10),
            count: 0,
          };
        });
      }

      // Sort dates chronologically
      const sortedDates = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));

      return sortedDates.map(([isoDate, count]) => {
        const dayDate = new Date(`${isoDate}T12:00:00+07:00`);
        const weekday =
          isoDate === today
            ? 'Hôm nay'
            : new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                weekday: 'short',
              })
                .format(dayDate)
                .replace(/\.$/, '');

        return {
          isoDate,
          month: isoDate.slice(5, 7),
          short: weekday,
          num: isoDate.slice(8, 10),
          count,
        };
      });
    }),
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
    cinemas: computed(() => {
      const map = new Map<
        string,
        { id: string; name: string; cityId?: string; cityName?: string; code?: string }
      >();
      for (const s of store.sessions()) {
        const id = s.cinema.code || s.cinema.dbId || s.cinema.id;
        if (id && !map.has(id)) {
          const cityName = getShowtimeCityName(s);
          map.set(id, {
            id,
            name: s.cinema.name,
            code: s.cinema.code,
            cityId: s.cinema.cityId || cityName,
            cityName,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }),
    formats: computed(() => {
      const set = new Set<string>();
      for (const s of store.sessions()) {
        if (s.movieFormat) set.add(s.movieFormat);
      }
      if (set.size === 0) {
        set.add('2D');
        set.add('3D');
        set.add('IMAX');
      }
      return Array.from(set).sort();
    }),
    movies: computed(() => {
      const map = new Map<
        string,
        { id: string; rawId: string; dbId: string; slug: string; name: string }
      >();
      for (const s of store.sessions()) {
        const key = s.movie.slug || s.movie.id || s.movie.dbId;
        if (key && !map.has(key)) {
          map.set(key, {
            id: key,
            rawId: String(s.movie.id || ''),
            dbId: String(s.movie.dbId || s.movie.id || ''),
            slug: String(s.movie.slug || ''),
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
