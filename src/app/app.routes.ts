import { Routes } from '@angular/router';
import { adminRoutes } from './admin.routes';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.Home), title: 'Katarina Komatina — Fotografija' },
  { path: 'fotografije', loadComponent: () => import('./pages/gallery').then((m) => m.Gallery), title: 'Fotografije — Katarina Komatina' },
  { path: 'mapa', loadComponent: () => import('./pages/map-page').then((m) => m.MapPage), title: 'Mapa — Katarina Komatina' },
  { path: 'drzava/:id', loadComponent: () => import('./pages/country').then((m) => m.CountryPage), title: 'Katarina Komatina' },
  { path: 'o-meni', loadComponent: () => import('./pages/about').then((m) => m.About), title: 'O meni — Katarina Komatina' },
  // /admin postoji SAMO lokalno (vidi admin.routes.ts i admin.routes.prod.ts)
  ...adminRoutes,
  { path: '**', redirectTo: '' },
];
