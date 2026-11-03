export interface AppEnvironment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly googleClientId: string;
  readonly useMocks: boolean;
  readonly defaultLang: 'vi' | 'en';
}

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '/api/v1',
  googleClientId: '',
  useMocks: false,
  defaultLang: 'vi',
};
