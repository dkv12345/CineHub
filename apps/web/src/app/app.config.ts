import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import {
  APP_CONFIG,
  authInterceptor,
  errorInterceptor,
  GlobalErrorHandler,
  requestIdInterceptor,
  TranslocoHttpLoader,
} from '@cinehub/web/core';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestIdInterceptor, authInterceptor, errorInterceptor]),
    ),
    provideTransloco({
      config: {
        availableLangs: ['vi', 'en'],
        defaultLang: environment.defaultLang,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    { provide: APP_CONFIG, useValue: environment },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
