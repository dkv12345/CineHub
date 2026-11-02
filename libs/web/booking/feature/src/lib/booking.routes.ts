import type { Routes } from '@angular/router';
import { CheckoutPageComponent } from './checkout-page.component';
import { ResultPageComponent } from './result-page.component';
import { SeatsPageComponent } from './seats-page.component';

export const BOOKING_ROUTES: Routes = [
  {
    path: 'seats/:showtimeId',
    component: SeatsPageComponent,
    title: 'Chọn ghế 3D POV | CineHub',
  },
  {
    path: 'checkout',
    component: CheckoutPageComponent,
    title: 'Thanh toán vé | CineHub',
  },
  {
    path: 'result/:ticketId',
    component: ResultPageComponent,
    title: 'Vé điện tử | CineHub',
  },
];
