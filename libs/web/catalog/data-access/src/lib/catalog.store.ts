import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { cinemas as seedCinemas, movies as seedMovies, type Movie } from '@cinehub/web/shared/util';

export interface CatalogState {
  readonly movies: readonly Movie[];
  readonly cinemas: typeof seedCinemas;
  readonly statusFilter: 'now' | 'soon' | 'all';
  readonly genreFilter: string;
  readonly searchQuery: string;
  readonly loading: boolean;
}

const initialState: CatalogState = {
  movies: seedMovies,
  cinemas: seedCinemas,
  statusFilter: 'now',
  genreFilter: 'all',
  searchQuery: '',
  loading: false,
};

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

      async refreshFromApi(): Promise<void> {
        patchState(store, { loading: true });
        try {
          const res = await firstValueFrom(http.get<{ data?: Movie[] }>('/api/v1/movies'));
          if (Array.isArray(res?.data) && res.data.length > 0) {
            patchState(store, { movies: res.data, loading: false });
            return;
          }
        } catch {
          // Fallback to embedded seed catalog when offline
        }
        patchState(store, { loading: false });
      },
    };
  }),
);

export const movieDetailResolver: ResolveFn<Movie | null> = (route: ActivatedRouteSnapshot) => {
  const store = inject(CatalogStore);
  const id = route.paramMap.get('id') ?? '';
  return store.findMovieById(id) ?? store.movies()[0] ?? null;
};
