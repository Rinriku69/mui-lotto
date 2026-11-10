import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LotteryData } from './lottery/lottery-data';
import { RangePicker } from './shared/range-picker';
import { Theme, ThemeService } from './shared/theme';

/**
 * App shell: sidebar (pages, date range, theme) on desktop, a top bar + page tabs on mobile,
 * and the routed page. The search box lives in the page's inspector only (one search, not two).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RangePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  host: {
    class: 'block',
    // host listener without @HostListener: '/' jumps to the inspector's search slots
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class App {
  protected readonly data = inject(LotteryData);
  protected readonly theme = inject(ThemeService);
  protected readonly themes: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'มืด' },
    { value: 'light', label: 'สว่าง' },
  ];

  protected readonly tabs = [
    { path: '/', label: 'รางวัลที่ 1–5', exact: true },
    { path: '/special', label: 'เลขหน้า / ท้าย', exact: false },
  ];

  protected onKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const typing = t?.closest('input, select, textarea, [contenteditable]');
    if (e.key === '/' && !typing) {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('#search input')?.focus();
    }
  }
}
