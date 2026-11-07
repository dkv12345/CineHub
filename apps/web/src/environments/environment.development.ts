export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  googleClientId: string;
  useMocks: boolean;
  defaultLang: 'vi' | 'en';
}

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '/api/v1',
  googleClientId: '430901569705-7pbpscnh5ur1avinojbqd015jg8ii0vg.apps.googleusercontent.com',
  useMocks: false,
  defaultLang: 'vi',
};
