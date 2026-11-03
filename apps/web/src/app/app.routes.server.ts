import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'movie/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'showtimes',
    renderMode: RenderMode.Server,
  },
  {
    path: 'concessions',
    renderMode: RenderMode.Server,
  },
  {
    path: 'seats/:showtimeId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout',
    renderMode: RenderMode.Client,
  },
  {
    path: 'result/:ticketId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-tickets',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'auth',
    renderMode: RenderMode.Client,
  },
  {
    path: 'verify-email',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
