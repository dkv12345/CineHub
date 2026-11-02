import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  cinemas as seedCinemas,
  dayInfo,
  getShows,
  movies as seedMovies,
} from '@cinehub/web/shared/util';
import {
  filterShowtimes,
  getShowtimeCityName,
  type GalaxySession,
  type ShowtimeFilters,
} from '@cinehub/web/showtimes/util';

function buildSeedSessions(): GalaxySession[] {
  const result: GalaxySession[] = [];
  const sampleMovies = seedMovies.slice(0, 12);
  const sampleCinemas = seedCinemas.slice(0, 10);

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const isoDate = d.toISOString().slice(0, 10);

    sampleMovies.forEach((m, mIdx) => {
      sampleCinemas.forEach((c, cIdx) => {
        if ((mIdx + cIdx + dayOffset) % 2 !== 0) return;
        const slots = getShows(m.id, cIdx, dayOffset);
        slots.forEach((slot, sIdx) => {
          result.push({
            id: `${m.id}__${c.id}__${slot.time}__${slot.format}__${dayOffset}`,
            showDate: isoDate,
            showTime: slot.time,
            screenName: `Cinema ${(sIdx % 6) + 1}`,
            movieFormat: slot.format,
            totalSeat: 120,
            bookedSeat: 15 + ((mIdx * 7 + sIdx * 11) % 70),
            caption: sIdx % 3 === 0 ? 'voice' : 'sub',
            version: slot.format.toLowerCase(),
            movie: {
              id: String(m.id),
              name: m.title,
              age: m.age,
              duration: 115,
              startDate: m.startDate ?? '',
              endDate: m.endDate ?? '',
              createdAt: '',
              imageLandscape: m.backdrop,
              imagePortrait: m.poster,
              slug: m.slug ?? '',
              trailer: m.trailer ?? '',
              rate: m.rating,
              totalVotes: m.votes,
              views: m.views ?? 1000,
              order: mIdx,
            },
            cinema: {
              id: String(c.id),
              code: String(c.code),
              name: c.name,
              latitude: '',
              longitude: '',
              address: c.address,
              phone: c.phone,
              cityId: c.cityId,
              imageLandscape: c.imageUrl,
              imagePortrait: c.thumbnailUrl,
              imageUrls: c.galleryUrls,
              order: cIdx,
            },
          });
        });
      });
    });
  }
  return result;
}

export interface ShowtimesState {
  readonly sessions: readonly GalaxySession[];
  readonly filters: ShowtimeFilters;
  readonly loading: boolean;
}

const initialState: ShowtimesState = {
  sessions: buildSeedSessions(),
  filters: {
    date: null,
    cityId: 'all',
    cinemaId: 'all',
    movieId: 'all',
    format: 'all',
    searchQuery: '',
  },
  loading: false,
};

export const ShowtimesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    days: computed(() =>
      [0, 1, 2, 3, 4].map((offset) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return {
          ...dayInfo(offset),
          isoDate: d.toISOString().slice(0, 10),
        };
      }),
    ),
    cities: computed(() => {
      const map = new Map<string, string>();
      for (const s of store.sessions()) {
        const name = getShowtimeCityName(s);
        map.set(s.cinema.cityId || name, name);
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
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
        patchState(store, { loading: true });
        try {
          const res = await firstValueFrom(
            http.get<{ data?: GalaxySession[] }>('/api/v1/sessions'),
          );
          if (Array.isArray(res?.data) && res.data.length > 0) {
            patchState(store, { sessions: res.data, loading: false });
            return;
          }
        } catch {
          // Keep rich local schedule when backend DB has no sessions
        }
        patchState(store, { loading: false });
      },
    };
  }),
);
