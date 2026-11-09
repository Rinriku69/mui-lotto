import { Routes } from '@angular/router';
import { MainPage } from './pages/main-page';
import { SeoData } from './shared/seo-title-strategy';

export const routes: Routes = [
  {
    path: '',
    component: MainPage,
    // keep in sync with the static <title>/description in index.html (what crawlers see before JS runs)
    title: 'สุ่มเลขหวย 6 ตัวตามเงื่อนไข · สถิติหวยย้อนหลัง · Mui Lotto',
    data: {
      description:
        'สุ่มเลขหวย 6 ตัวตามเงื่อนไขที่ชอบ เช่น ลงท้าย 99 หรือมีเลข 8 อย่างน้อย 2 ตัว แล้วดูสถิติหวยย้อนหลังรางวัลที่ 1–5 ตั้งแต่ปี 2549 ว่าเลขแบบนั้นเคยออกกี่ครั้ง ทุกเลขมีโอกาสถูกเท่ากัน',
    } satisfies SeoData,
  },
  {
    path: 'special',
    // lazy: the special-prize tab is its own JS chunk, downloaded only when first opened
    loadComponent: () => import('./pages/special-page').then((m) => m.SpecialPage),
    title: 'สถิติเลขท้าย 2 ตัว 3 ตัว · เลขหน้า 3 ตัว ย้อนหลัง · Mui Lotto',
    data: {
      description:
        'สถิติเลขท้าย 2 ตัว เลขหน้า 3 ตัว และเลขท้าย 3 ตัวย้อนหลัง: ความถี่ของเลข 00–99 และของแต่ละหลัก พร้อมค้นหาว่าเลขที่สนใจเคยออกงวดไหน',
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
