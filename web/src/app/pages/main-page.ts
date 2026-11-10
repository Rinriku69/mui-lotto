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
    <app-page-layout
      heading="สุ่มเลขหวย 6 ตัวตามเงื่อนไข + สถิติหวยย้อนหลัง"
      lead="กำหนดเงื่อนไขที่ชอบ เช่น ลงท้าย 99 หรือมีเลข 8 อย่างน้อย 2 ตัว แล้วสุ่มเลขสลากที่เข้าเงื่อนไข พร้อมดูว่าเลขแบบนั้นเคยออกรางวัลที่ 1–5 กี่ครั้งตั้งแต่ปี 2549 · ทุกเลขมีโอกาสถูกเท่ากัน ไม่ใช่การทำนายผล"
    >
      <app-number-generator top />
      <app-kpi-row [kpis]="kpis()" />
      <app-heatmap-panel />
      <app-number-search aside scope="main" />
    </app-page-layout>
  `,
})
export class MainPage {
  private readonly data = inject(LotteryData);

  /** The three summary tiles, all derived from the selected date range. */
  protected readonly kpis = computed<Kpi[]>(() => {
    const draws = this.data.draws();
    const from = draws[0]?.date;
    const to = draws.at(-1)?.date;
    const beyond = this.data.beyond2Total();
    const expected = this.data.beyond2Expected;
    return [
      { label: 'งวดในช่วงที่เลือก', value: num.format(draws.length), sub: `${thaiDate(from)} – ${thaiDate(to)}` },
      { label: 'รางวัลที่ 1 ล่าสุด', value: draws.at(-1)?.prizes[0][0] ?? '–', sub: `งวด ${thaiDate(to)}` },
      {
        label: 'ช่องที่ห่างจากค่าคาดเกิน ±2σ',
        value: `${beyond} / 300`,
        sub: `สุ่มล้วนคาดไว้ ~${Math.round(expected)} ช่อง · ${beyond <= expected * 1.5 ? 'อยู่ในเกณฑ์ปกติ' : 'มากกว่าที่คาด'}`,
      },
    ];
  });
}
