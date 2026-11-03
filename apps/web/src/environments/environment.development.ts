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
  googleClientId: '227642466702-eb0l4ee6efscac08s4137b1tco4jc64c.apps.googleusercontent.com',
  useMocks: false,
  defaultLang: 'vi',
};
