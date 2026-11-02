import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export interface AccountPreferencesState {
  readonly preferredCity: string;
  readonly preferredFormat: '2D' | '3D' | 'IMAX';
  readonly emailAlerts: boolean;
}

const initialState: AccountPreferencesState = {
  preferredCity: 'TP. Hồ Chí Minh',
  preferredFormat: 'IMAX',
  emailAlerts: true,
};

export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    updatePreferences(partial: Partial<AccountPreferencesState>): void {
      patchState(store, partial);
    },
  })),
);
