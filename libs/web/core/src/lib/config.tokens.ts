import { InjectionToken } from '@angular/core';

export interface AppConfig {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly googleClientId: string;
  readonly useMocks: boolean;
  readonly defaultLang: 'vi' | 'en';
}

export const APP_CONFIG = new InjectionToken<AppConfig>('CINEHUB_APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    production: false,
    apiBaseUrl: '/api/v1',
    googleClientId: '',
    useMocks: false,
    defaultLang: 'vi',
  }),
});
