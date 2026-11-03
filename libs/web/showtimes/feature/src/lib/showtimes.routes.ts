import type { Routes } from '@angular/router';
import { ShowtimesPageComponent } from './showtimes-page.component';

export const SHOWTIMES_ROUTES: Routes = [
  {
    path: 'showtimes',
    component: ShowtimesPageComponent,
    title: 'Lịch chiếu phim toàn quốc | CineHub',
  },
];
