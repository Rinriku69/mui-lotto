import { Routes } from '@angular/router';
import { MainPage } from './pages/main-page';
import { SeoData } from './shared/seo-title-strategy';

export const routes: Routes = [
  {
    path: '',
    component: MainPage,
    title: 'สุ่มเลขสลากจาก pattern · สถิติรางวัลที่ 1–5 · Mui Lotto',
    data: {
      description:
        'ไม่รู้จะซื้อเลขอะไร? ลองสุ่มเลขสลาก 6 หลักจาก pattern ที่ชอบ เช่น ลงท้าย 99 หรือมีเลข 8 อย่างน้อย 2 ตัว แล้วดูสถิติย้อนหลังตั้งแต่ปี 2549 ว่าเลขแบบนั้นเคยออกกี่ครั้ง',
    } satisfies SeoData,
  },
  {
    path: 'special',
    // lazy: the special-prize tab is its own JS chunk, downloaded only when first opened
    loadComponent: () => import('./pages/special-page').then((m) => m.SpecialPage),
    title: 'เลขหน้า/ท้าย · Mui Lotto',
    data: {
      description:
        'สถิติย้อนหลังของเลขหน้า 3 ตัว เลขท้าย 3 ตัว และเลขท้าย 2 ตัว: ความถี่ของเลข 00–99 และของแต่ละหลัก พร้อมค้นหาประวัติการออก',
    } satisfies SeoData,
  },
  {
    // a real page instead of redirecting to '': a redirect makes every typo URL a copy of the home page
    path: '**',
    loadComponent: () => import('./pages/not-found-page').then((m) => m.NotFoundPage),
    title: 'ไม่พบหน้านี้ · Mui Lotto',
    data: { robots: 'noindex' } satisfies SeoData,
  },
];
