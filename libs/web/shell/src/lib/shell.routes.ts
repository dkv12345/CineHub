import type { Routes } from '@angular/router';
import { ShellLayoutComponent } from './shell-layout.component';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [],
  },
];
