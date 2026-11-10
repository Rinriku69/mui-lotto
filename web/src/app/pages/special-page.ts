import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LotteryData } from '../lottery/lottery-data';
import { SPECIAL_LABEL, SpecialKind } from '../lottery/lottery.model';
import { BEYOND2_SHARE, CellStat, GridStats } from '../lottery/stats';
import { HeatGrid } from '../heatmap/heat-grid';
import { HeatLegend } from '../heatmap/heat-legend';
import { NumberSearch } from '../search/number-search';
import { Kpi, KpiRow } from '../shared/kpi-row';
import { PageLayout } from '../shared/page-layout';
import { thaiDate } from '../shared/thai-date';

const PAGE_SIZE = 20;
const COLLAPSED = 6;

/** Tab "เลขหน้า/ท้าย": front-3, last-3 and last-2 prizes. */
@Component({
  selector: 'app-special-page',
  imports: [DecimalPipe, PageLayout, KpiRow, HeatGrid, HeatLegend, NumberSearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './special-page.html',
})
export class SpecialPage {
  protected readonly data = inject(LotteryData);
  protected readonly label = SPECIAL_LABEL;
  protected readonly beyond2Expected30 = 30 * BEYOND2_SHARE;

  // ---------- KPIs ----------
  protected readonly kpis = computed<Kpi[]>(() => {
    const last = this.data.draws().at(-1);
    const s = last?.special;
    const l2 = this.data.last2Stats();
    return [
      { label: 'เลขท้าย 2 ตัว · งวดล่าสุด', value: s?.last2[0] ?? '–', sub: `งวด ${thaiDate(last?.date)}` },
      { label: 'เลขหน้า 3 ตัว · งวดล่าสุด', value: s?.front3.join('  ') || '–', sub: `${this.data.front3Draws()} งวดที่มีรางวัลนี้` },
      { label: 'เลขท้าย 3 ตัว · งวดล่าสุด', value: s?.last3.join('  ') || '–', sub: `${this.data.draws().length} งวด · ${this.data.specialByKind().last3.length.toLocaleString('en-US')} เลข` },
      { label: 'ช่องที่เกิน ±2σ (00–99)', value: `${l2.beyond2} / 100`, sub: `สุ่มล้วนคาดไว้ ~${(100 * BEYOND2_SHARE).toFixed(1)} ช่อง` },
    ];
  });

  // ---------- 00–99 grid ----------
  protected readonly hoveredPair = signal<CellStat | null>(null);

  /** The searched number, when the shared query is exactly two digits. */
  private readonly queriedPair = computed<CellStat | null>(() => {
    const t = this.data.searchQuery().text.trim();
    if (!/^\d{2}$/.test(t)) return null;
    return this.data.last2Stats().cells[+t[0]][+t[1]];
  });
  protected readonly selectedPair = computed(() => this.hoveredPair() ?? this.queriedPair());

  /** ±2σ band in whole draws, e.g. "1–9 ครั้ง". */
  protected readonly normalBand = computed(() => {
    const { expected, sd } = this.data.last2Stats();
    return `${Math.max(0, Math.ceil(expected - 2 * sd))}–${Math.floor(expected + 2 * sd)}`;
  });

  protected readonly pairFacts = computed(() => {
    const s = this.data.last2Stats();
    const cells = s.cells.flat();
    if (!s.total) return [];
    const max = Math.max(...cells.map((c) => c.count));
    const min = Math.min(...cells.map((c) => c.count));
    const names = (v: number) =>
      cells
        .filter((c) => c.count === v)
        .map((c) => `${c.digit}${c.pos}`)
        .slice(0, 4)
        .join(', ');
    return [
      { k: 'ออกบ่อยที่สุด', v: `${names(max)} · ${max} ครั้ง` },
      { k: 'ออกน้อยที่สุด', v: `${names(min)} · ${min} ครั้ง` },
      // the band right under the extremes, so "most / least" never reads as hot / cold numbers
      { k: 'ช่วงปกติถ้าสุ่มล้วน', v: `${this.normalBand()} ครั้ง (คาด ${s.expected.toFixed(1)})` },
      { k: 'ช่องที่เกิน ±2σ', v: `${s.beyond2} จาก 100 · คาด ~${(100 * BEYOND2_SHARE).toFixed(1)}` },
    ];
  });

  // ---------- 3-digit grids ----------
  protected readonly triples = computed<{ kind: SpecialKind; stats: GridStats; sub: string }[]>(() => [
    {
      kind: 'front3',
      stats: this.data.front3Stats(),
      sub: `${this.data.specialByKind().front3.length.toLocaleString('en-US')} เลข · ${this.data.front3Draws()} งวด (ตั้งแต่ ก.ย. 2558)`,
    },
    {
      kind: 'last3',
      stats: this.data.last3Stats(),
      sub: `${this.data.specialByKind().last3.length.toLocaleString('en-US')} เลข · ${this.data.draws().length} งวด`,
    },
  ]);
  protected readonly hoveredTriple = signal<{ kind: SpecialKind; cell: CellStat } | null>(null);

  protected inspectTriple(kind: SpecialKind, cell: CellStat | null) {
    this.hoveredTriple.set(cell ? { kind, cell } : null);
  }

  // ---------- recent draws (collapsed list / paginated full history) ----------
  protected readonly expanded = signal(false);
  protected readonly page = signal(0);
  private readonly newestFirst = computed(() => [...this.data.draws()].reverse());
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.newestFirst().length / PAGE_SIZE)));
  protected readonly rows = computed(() => {
    const all = this.newestFirst();
    if (!this.expanded()) return all.slice(0, COLLAPSED);
    const p = Math.min(this.page(), this.pageCount() - 1); // range filter may shrink the list
    return all.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  });
  protected readonly thaiDate = thaiDate;

  protected toggleExpanded() {
    this.expanded.update((v) => !v);
    this.page.set(0);
  }

  protected goPage(delta: number) {
    this.page.update((p) => Math.min(Math.max(0, p + delta), this.pageCount() - 1));
  }
}
