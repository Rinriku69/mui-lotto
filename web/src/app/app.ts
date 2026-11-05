import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { LotteryData } from './lottery/lottery-data';
import { PRIZES, PRIZE_LABEL } from './lottery/lottery.model';
import { PrizeHeatmap } from './heatmap/prize-heatmap';
import { NumberSearch } from './search/number-search';
import { NumberGenerator } from './generator/number-generator';

interface Preset {
  label: string;
  years: number | null; // null = all
}

@Component({
  selector: 'app-root',
  imports: [FormField, DecimalPipe, PrizeHeatmap, NumberSearch, NumberGenerator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly data = inject(LotteryData);
  protected readonly prizes = PRIZES;
  protected readonly prizeLabel = PRIZE_LABEL;

  /** Date inputs write straight into the shared range signal. */
  protected readonly rangeForm = form(this.data.range);

  protected readonly presets: Preset[] = [
    { label: 'ทั้งหมด', years: null },
    { label: '10 ปี', years: 10 },
    { label: '5 ปี', years: 5 },
    { label: '1 ปี', years: 1 },
  ];

  protected readonly shownFrom = computed(() => this.data.draws()[0]?.date ?? '–');
  protected readonly shownTo = computed(() => this.data.draws().at(-1)?.date ?? '–');

  protected applyPreset(p: Preset) {
    if (p.years === null) {
      this.data.range.set({ from: '', to: '' });
      return;
    }
    const last = new Date(this.data.lastDate());
    last.setFullYear(last.getFullYear() - p.years);
    this.data.range.set({ from: last.toISOString().slice(0, 10), to: '' });
  }
}
