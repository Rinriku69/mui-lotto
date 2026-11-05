import { Routes } from '@angular/router';
import { MainPage } from './pages/main-page';

export const routes: Routes = [
  { path: '', component: MainPage, title: 'รางวัลที่ 1–5 · Mui Lotto' },
  {
    path: 'special',
    // lazy: the special-prize tab is its own JS chunk, downloaded only when first opened
    loadComponent: () => import('./pages/special-page').then((m) => m.SpecialPage),
    title: 'เลขหน้า/ท้าย · Mui Lotto',
  },
  { path: '**', redirectTo: '' },
];
