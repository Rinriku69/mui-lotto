import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LotteryData } from '../lottery/lottery-data';
import { HeatmapPanel } from '../heatmap/heatmap-panel';
import { NumberGenerator } from '../generator/number-generator';
import { NumberSearch } from '../search/number-search';
import { Kpi, KpiRow } from '../shared/kpi-row';
import { PageLayout } from '../shared/page-layout';
import { thaiDate } from '../shared/thai-date';

const num = new Intl.NumberFormat('en-US');

/** Tab "รางวัลที่ 1–5": 6-digit prizes. */
@Component({
  selector: 'app-main-page',
  imports: [PageLayout, KpiRow, HeatmapPanel, NumberGenerator, NumberSearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-layout>
      <app-number-generator />
      <app-kpi-row [kpis]="kpis()" />
      <app-heatmap-panel />
      <app-number-search aside scope="main" />
    </app-page-layout>
  `,
})
export class MainPage {
  private readonly data = inject(LotteryData);

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
}
