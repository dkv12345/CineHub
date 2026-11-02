import type { Routes } from '@angular/router';
import { MyTicketsPageComponent } from './my-tickets-page.component';

export const TICKETS_ROUTES: Routes = [
  {
    path: 'my-tickets',
    component: MyTicketsPageComponent,
    title: 'Vé của tôi | CineHub',
  },
];
