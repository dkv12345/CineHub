import type { Routes } from '@angular/router';
import { movieDetailResolver } from '@cinehub/web/catalog/data-access';
import { HomePageComponent } from './home-page.component';
import { MovieDetailPageComponent } from './movie-detail-page.component';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'CineHub – Đặt vé xem phim & Chọn ghế 3D POV',
  },
  {
    path: 'movie/:id',
    component: MovieDetailPageComponent,
    resolve: {
      movie: movieDetailResolver,
    },
    title: 'Chi tiết phim | CineHub',
  },
];
