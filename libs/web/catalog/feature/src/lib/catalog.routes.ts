import type { Routes } from '@angular/router';
import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import type { Movie } from '@cinehub/web/shared/util';
import { HomePageComponent } from './home-page.component';
import { MovieDetailPageComponent } from './movie-detail-page.component';
import { CinemaCornerListPageComponent } from './cinema-corner-list-page.component';
import { CinemaCornerDetailPageComponent } from './cinema-corner-detail-page.component';

const movieDetailResolver: ResolveFn<Movie | null> = (route) => {
  const catalogStore = inject(CatalogStore);
  const showtimesStore = inject(ShowtimesStore);
  const id = route.paramMap.get('id') ?? '';

  return Promise.all([catalogStore.refreshFromApi(), showtimesStore.loadSessionsFromApi()]).then(
    () => catalogStore.findMovieById(id),
  );
};

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
  {
    path: 'cinema-corner',
    component: CinemaCornerListPageComponent,
    title: 'Góc điện ảnh | CineHub',
  },
  {
    path: 'cinema-corner/:slug',
    component: CinemaCornerDetailPageComponent,
    title: 'Review phim | Góc điện ảnh | CineHub',
  },
];
