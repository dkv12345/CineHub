import type { Routes } from '@angular/router';
import { authGuard } from '@cinehub/web/core';
import { CheckoutPageComponent } from './checkout-page.component';
import { ResultPageComponent } from './result-page.component';
import { SeatsPageComponent } from './seats-page.component';

export const BOOKING_ROUTES: Routes = [
  {
    path: 'seats/:showtimeId',
    component: SeatsPageComponent,
    canActivate: [authGuard],
    title: 'Chọn ghế 3D POV | CineHub',
  },
  {
    path: 'checkout',
    component: CheckoutPageComponent,
    canActivate: [authGuard],
    title: 'Thanh toán vé | CineHub',
  },
  {
    path: 'result/:bookingId',
    component: ResultPageComponent,
    title: 'Vé điện tử | CineHub',
  },
  {
    path: 'result',
    component: ResultPageComponent,
    title: 'Vé điện tử | CineHub',
  },
];
