import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, type Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/i18n/${lang}.json`).pipe(
      catchError(() =>
        of({
          nav: {
            home: lang === 'en' ? 'Home' : 'Trang chủ',
            showtimes: lang === 'en' ? 'Showtimes' : 'Lịch chiếu',
            concessions: lang === 'en' ? 'Concessions' : 'Bắp & Nước',
            tickets: lang === 'en' ? 'My Tickets' : 'Vé của tôi',
            profile: lang === 'en' ? 'Account' : 'Tài khoản',
            login: lang === 'en' ? 'Sign In' : 'Đăng nhập',
            logout: lang === 'en' ? 'Sign Out' : 'Đăng xuất',
          },
        }),
      ),
    );
  }
}
