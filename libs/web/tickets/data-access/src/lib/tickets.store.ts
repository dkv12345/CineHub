import { signalStore, withMethods, withState, patchState } from '@ngrx/signals';

export interface TicketsFilterState {
  readonly statusFilter: 'ALL' | 'VALID' | 'USED' | 'CANCELLED';
}

const initialState: TicketsFilterState = {
  statusFilter: 'ALL',
};

export const TicketsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setStatusFilter(statusFilter: 'ALL' | 'VALID' | 'USED' | 'CANCELLED'): void {
      patchState(store, { statusFilter });
    },
  })),
);
