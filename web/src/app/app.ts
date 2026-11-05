import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { LotteryData } from './lottery/lottery-data';
import { HeatmapPanel } from './heatmap/heatmap-panel';
import { NumberSearch } from './search/number-search';
import { NumberGenerator } from './generator/number-generator';
import { thaiDate } from './shared/thai-date';

interface Preset {
  id: string;
  label: string;
  years: number | null; // null = all
}

interface Kpi {
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}

const num = new Intl.NumberFormat('en-US');

@Component({
  selector: 'app-root',
  imports: [FormField, HeatmapPanel, NumberSearch, NumberGenerator],
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

  protected readonly presets: Preset[] = [
    { id: 'all', label: 'ALL', years: null },
    { id: '10y', label: '10Y', years: 10 },
    { id: '5y', label: '5Y', years: 5 },
    { id: '1y', label: '1Y', years: 1 },
  ];
  protected readonly activePreset = signal('all');
  protected readonly customOpen = signal(false);

  private readonly cmd = viewChild<ElementRef<HTMLInputElement>>('cmd');

  /** The four summary tiles, all derived from the selected date range. */
  protected readonly kpis = computed<Kpi[]>(() => {
    const draws = this.data.draws();
    const from = draws[0]?.date;
    const to = draws.at(-1)?.date;
    return [
      { label: 'งวดในช่วงที่เลือก', value: num.format(draws.length), sub: `${thaiDate(from)} → ${thaiDate(to)}` },
      { label: 'เลขที่ออกทั้งหมด', value: num.format(this.data.entries().length), sub: 'รางวัลที่ 1–5' },
      {
        label: 'ช่องที่เกิน ±2σ',
        value: `${this.data.beyond2Total()} / 300`,
        sub: `สุ่มยุติธรรมคาด ~${this.data.beyond2Expected.toFixed(1)}`,
      },
      { label: 'งวดล่าสุด · รางวัลที่ 1', value: draws.at(-1)?.prizes[0][0] ?? '–', sub: thaiDate(to), gold: true },
    ];
  });

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
