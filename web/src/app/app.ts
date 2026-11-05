import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormField, form } from '@angular/forms/signals';
import { LotteryData } from './lottery/lottery-data';

interface Preset {
  id: string;
  label: string;
  years: number | null; // null = all
}

/**
 * App shell: command bar (tabs, shared search, date range) + the routed page.
 * The search query and the range live in LotteryData, so both tabs see the same values.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  host: {
    class: 'block min-h-screen',
    // host listener without @HostListener: '/' jumps to the command-bar search, like most dev tools
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class App {
  protected readonly data = inject(LotteryData);
  protected readonly searchForm = this.data.searchForm;
  protected readonly rangeForm = form(this.data.range);

  protected readonly tabs = [
    { path: '/', label: 'รางวัลที่ 1–5', exact: true },
    { path: '/special', label: 'เลขหน้า/ท้าย', exact: false },
  ];

  protected readonly presets: Preset[] = [
    { id: 'all', label: 'ALL', years: null },
    { id: '10y', label: '10Y', years: 10 },
    { id: '5y', label: '5Y', years: 5 },
    { id: '1y', label: '1Y', years: 1 },
  ];
  protected readonly activePreset = signal('all');
  protected readonly customOpen = signal(false);

  private readonly cmd = viewChild<ElementRef<HTMLInputElement>>('cmd');

  protected applyPreset(p: Preset) {
    this.activePreset.set(p.id);
    this.customOpen.set(false);
    if (p.years === null) {
      this.data.range.set({ from: '', to: '' });
      return;
    }
    const last = new Date(this.data.lastDate());
    last.setFullYear(last.getFullYear() - p.years);
    this.data.range.set({ from: last.toISOString().slice(0, 10), to: '' });
  }

  protected toggleCustom() {
    this.activePreset.set('custom');
    this.customOpen.update((open) => !open);
  }

  protected onKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const typing = t?.closest('input, select, textarea, [contenteditable]');
    if (e.key === '/' && !typing) {
      e.preventDefault();
      this.cmd()?.nativeElement.focus();
    }
  }
}
