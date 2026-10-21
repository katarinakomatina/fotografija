import { Routes } from '@angular/router';

// Ova verzija se koristi SAMO kad sajt pokreneš na svom računaru (npm run admin / npm start).
// Kad Vercel pravi pravi sajt (ng build), ovaj fajl se zameni fajlom admin.routes.prod.ts,
// pa admin stranica uopšte ne postoji na internetu.
export const adminRoutes: Routes = [
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin), title: 'Admin — Katarina Komatina' },
];
