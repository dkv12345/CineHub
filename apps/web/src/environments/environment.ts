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
  googleClientId: '430901569705-7pbpscnh5ur1avinojbqd015jg8ii0vg.apps.googleusercontent.com',
  useMocks: false,
  defaultLang: 'vi',
};
