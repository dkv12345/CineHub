import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
import { firstValueFrom } from 'rxjs';
import { cinemas as seedCinemas, movies as seedMovies, type Movie } from '@cinehub/web/shared/util';

export interface CatalogState {
  readonly movies: readonly Movie[];
  readonly cinemas: typeof seedCinemas;
  readonly statusFilter: 'now' | 'soon' | 'all';
  readonly genreFilter: string;
  readonly searchQuery: string;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notifiedMovieIds: readonly string[];
}

const initialState: CatalogState = {
  movies: seedMovies,
  cinemas: seedCinemas,
  statusFilter: 'now',
  genreFilter: 'all',
  searchQuery: '',
  loading: false,
  error: null,
  notifiedMovieIds: [],
};

const NOTIFIED_MOVIES_STORAGE_KEY = 'cinehub_notified_movies';

export const CatalogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    featuredMovie: computed(
      () => store.movies().find((m) => m.status === 'now') ?? store.movies()[0] ?? null,
    ),
    availableGenres: computed(() => {
      const set = new Set<string>();
      for (const m of store.movies()) {
        for (const g of m.genre.split(',')) {
          const trimmed = g.trim();
          if (trimmed) set.add(trimmed);
        }
      }
      return Array.from(set).slice(0, 10);
    }),
    filteredMovies: computed(() => {
      const status = store.statusFilter();
      const genre = store.genreFilter();
      const q = store.searchQuery().trim().toLowerCase();

      return store.movies().filter((movie) => {
        if (status !== 'all' && movie.status !== status) {
          return false;
        }
        if (genre !== 'all' && !movie.genre.toLowerCase().includes(genre.toLowerCase())) {
          return false;
        }
        if (
          q &&
          !movie.title.toLowerCase().includes(q) &&
          !movie.cast.toLowerCase().includes(q) &&
          !movie.director.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    return {
      setStatusFilter(statusFilter: 'now' | 'soon' | 'all'): void {
        patchState(store, { statusFilter });
      },

      setGenreFilter(genreFilter: string): void {
        patchState(store, { genreFilter });
      },

      setSearchQuery(searchQuery: string): void {
        patchState(store, { searchQuery });
      },

      findMovieById(id: string | number): Movie | null {
        const target = String(id);
        return store.movies().find((m) => String(m.id) === target || m.slug === target) ?? null;
      },

      isMovieNotified(id: string | number): boolean {
        return store.notifiedMovieIds().includes(String(id));
      },

      toggleMovieNotification(id: string | number): void {
        const movieId = String(id);
        const current = store.notifiedMovieIds();
        const notifiedMovieIds = current.includes(movieId)
          ? current.filter((value) => value !== movieId)
          : [...current, movieId];
        patchState(store, { notifiedMovieIds });
        if (isBrowser) {
          localStorage.setItem(NOTIFIED_MOVIES_STORAGE_KEY, JSON.stringify(notifiedMovieIds));
        }
      },

      async refreshFromApi(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const res = await firstValueFrom(http.get<{ data?: Movie[] }>('/api/v1/movies'));
          if (!Array.isArray(res?.data)) {
            throw new Error('API phim trả về dữ liệu không hợp lệ.');
          }
          patchState(store, { movies: res.data, loading: false });
        } catch (error) {
          const message =
            error instanceof HttpErrorResponse
              ? `Không thể cập nhật danh sách phim (HTTP ${error.status}).`
              : error instanceof Error
                ? `Không thể cập nhật danh sách phim: ${error.message}`
                : 'Không thể cập nhật danh sách phim từ máy chủ.';
          patchState(store, { loading: false, error: message });
        }
      },
    };
  }),
  withHooks((store) => {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    return {
      onInit() {
        if (!isBrowser) return;
        try {
          const raw = localStorage.getItem(NOTIFIED_MOVIES_STORAGE_KEY);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
            patchState(store, { notifiedMovieIds: parsed });
          }
        } catch {
          patchState(store, { notifiedMovieIds: [] });
        }
      },
    };
  }),
);
