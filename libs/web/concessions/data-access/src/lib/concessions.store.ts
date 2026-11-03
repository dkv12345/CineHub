import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { combos as seedCombos } from '@cinehub/web/shared/util';

export interface ConcessionItem {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly price: number;
  readonly icon: string;
}

export interface ConcessionsState {
  readonly items: readonly ConcessionItem[];
  readonly quantities: Record<string, number>;
  readonly loading: boolean;
}

const initialState: ConcessionsState = {
  items: seedCombos,
  quantities: {},
  loading: false,
};

export const ConcessionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    totalAmount: computed(() => {
      const q = store.quantities();
      return store.items().reduce((sum, item) => sum + item.price * (q[item.id] ?? 0), 0);
    }),
    totalCount: computed(() => Object.values(store.quantities()).reduce((a, b) => a + b, 0)),
    selectedItems: computed(() => {
      const q = store.quantities();
      return store
        .items()
        .filter((item) => (q[item.id] ?? 0) > 0)
        .map((item) => ({
          ...item,
          qty: q[item.id] ?? 0,
        }));
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      increment(id: string): void {
        const current = store.quantities()[id] ?? 0;
        patchState(store, {
          quantities: { ...store.quantities(), [id]: Math.min(20, current + 1) },
        });
      },

      decrement(id: string): void {
        const current = store.quantities()[id] ?? 0;
        const next = Math.max(0, current - 1);
        patchState(store, {
          quantities: { ...store.quantities(), [id]: next },
        });
      },

      clearConcessions(): void {
        patchState(store, { quantities: {} });
      },

      async loadFromApi(): Promise<void> {
        patchState(store, { loading: true });
        try {
          const res = await firstValueFrom(
            http.get<{ data?: ConcessionItem[] }>('/api/v1/concessions'),
          );
          if (Array.isArray(res?.data) && res.data.length > 0) {
            patchState(store, { items: res.data, loading: false });
            return;
          }
        } catch {
          // Keep default F&B menu
        }
        patchState(store, { loading: false });
      },
    };
  }),
);
