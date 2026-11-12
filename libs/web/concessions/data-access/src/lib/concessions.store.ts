import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

export const MAX_CONCESSION_QUANTITY = 10;

export type ConcessionCategory = 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';

export interface ConcessionItem {
  readonly id: string;
  readonly externalId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly category: ConcessionCategory;
  readonly imageUrl: string | null;
  readonly price: number;
  readonly minSeats: number;
  readonly maxSeats: number;
  readonly eligible: boolean;
}

export interface ConcessionsState {
  readonly items: readonly ConcessionItem[];
  readonly quantities: Record<string, number>;
  readonly selectedCategory: ConcessionCategory;
  readonly loading: boolean;
  readonly error: string | null;
}

const initialState: ConcessionsState = {
  items: [],
  quantities: {},
  selectedCategory: 'COMBO',
  loading: false,
  error: null,
};

export const ConcessionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    totalAmount: computed(() =>
      store.items().reduce((sum, item) => sum + item.price * (store.quantities()[item.id] ?? 0), 0),
    ),
    totalCount: computed(() => Object.values(store.quantities()).reduce((a, b) => a + b, 0)),
    selectedItems: computed(() =>
      store
        .items()
        .filter((item) => (store.quantities()[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: store.quantities()[item.id] ?? 0 })),
    ),
    visibleItems: computed(() =>
      store.items().filter((item) => item.category === store.selectedCategory()),
    ),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      selectCategory(selectedCategory: ConcessionCategory): void {
        patchState(store, { selectedCategory });
      },

      increment(id: string): void {
        const item = store.items().find((concession) => concession.id === id);
        if (!item?.eligible) return;
        const current = store.quantities()[id] ?? 0;
        patchState(store, {
          quantities: {
            ...store.quantities(),
            [id]: Math.min(MAX_CONCESSION_QUANTITY, current + 1),
          },
        });
      },

      decrement(id: string): void {
        const current = store.quantities()[id] ?? 0;
        const next = Math.max(0, current - 1);
        const quantities = { ...store.quantities() };
        if (next === 0) delete quantities[id];
        else quantities[id] = next;
        patchState(store, { quantities });
      },

      clearConcessions(): void {
        patchState(store, { quantities: {} });
      },

      async loadFromApi(cinemaId: string, seats: number): Promise<string[]> {
        const previousItems = new Map(store.items().map((item) => [item.id, item.name]));
        patchState(store, { loading: true, error: null });
        try {
          const params: Record<string, string> = { seats: String(seats) };
          if (cinemaId) params['cinemaId'] = cinemaId;
          const res = await firstValueFrom(
            http.get<{ data?: ConcessionItem[] }>('/api/v1/concessions', { params }),
          );
          if (!Array.isArray(res?.data)) {
            throw new Error('Dữ liệu bắp nước từ máy chủ không hợp lệ.');
          }

          const quantities = { ...store.quantities() };
          const removed: string[] = [];
          for (const [id, quantity] of Object.entries(quantities)) {
            const item = res.data.find((candidate) => candidate.id === id);
            if (!item?.eligible) {
              if (quantity > 0) removed.push(previousItems.get(id) || item?.name || 'Món bắp nước');
              delete quantities[id];
            }
          }
          patchState(store, { items: res.data, quantities, loading: false });
          return removed;
        } catch (error) {
          const message =
            error instanceof HttpErrorResponse
              ? `Không thể tải bắp nước (HTTP ${error.status}). Vui lòng thử lại.`
              : error instanceof Error
                ? error.message
                : 'Không thể tải bắp nước từ máy chủ. Vui lòng thử lại.';
          patchState(store, { loading: false, error: message });
          return [];
        }
      },
    };
  }),
);
