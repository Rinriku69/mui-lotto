import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { LotteryData } from '../lottery/lottery-data';
import { PRIZES, PRIZE_LABEL, WinEntry } from '../lottery/lottery.model';
import { Matcher, SPACE, SearchMode, buildMatcher, enumerate } from '../lottery/number-pattern';

interface PrizeStat {
  prize: number;
  label: string;
  hits: number;
  expected: number;
  ratio: number | null;
  /** bar width in % of the track; the track spans ratio 0 .. RATIO_MAX */
  barPct: number;
}

const RECENT = 7;
const MAX_LIST = 120;
/** Bullet chart scale: ratio 0..1.6, so the "expected" tick (ratio 1) sits at 62.5%. */
const RATIO_MAX = 1.6;
const num = new Intl.NumberFormat('en-US');

@Component({
  selector: 'app-number-search',
  imports: [FormField, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-search.html',
  host: { class: 'block' },
})
export class NumberSearch {
  private readonly data = inject(LotteryData);
  protected readonly searchForm = this.data.searchForm;

  readonly modes: { value: SearchMode; label: string; hint: string }[] = [
    { value: 'anywhere', label: 'ANY', hint: 'ตรงไหนก็ได้ · 59 → 159302, 845902' },
    { value: 'suffix', label: 'SUFFIX', hint: 'เลขท้าย · 59 → xxxx59' },
    { value: 'prefix', label: 'PREFIX', hint: 'เลขหน้า · 59 → 59xxxx' },
    { value: 'position', label: 'POS', hint: 'ตรงตำแหน่ง · x = หลักไหนก็ได้ เช่น x4xx99' },
  ];
  readonly examples = [
    { mode: 'suffix' as const, text: '61' },
    { mode: 'anywhere' as const, text: '888' },
    { mode: 'position' as const, text: 'x4xx99' },
  ];
  readonly tickPct = (1 / RATIO_MAX) * 100;

  readonly expanded = signal(false);

  readonly query = this.data.searchQuery;
  readonly hint = computed(() => this.modes.find((m) => m.value === this.query().mode)!.hint);

  /** Ghost "xxxx" in front of a suffix query shows which positions are free. */
  readonly ghost = computed(() => {
    const { mode, text } = this.query();
    const free = Math.max(0, 6 - text.trim().length);
    if (!text.trim() || mode === 'position' || mode === 'anywhere') return { before: '', after: '' };
    return mode === 'suffix' ? { before: 'x'.repeat(free), after: '' } : { before: '', after: 'x'.repeat(free) };
  });

  readonly matcher = computed<Matcher | string | null>(() => buildMatcher(this.query().mode, this.query().text));
  readonly error = computed(() => {
    const m = this.matcher();
    return typeof m === 'string' ? m : null;
  });
  private readonly valid = computed(() => {
    const m = this.matcher();
    return m && typeof m !== 'string' ? m : null;
  });

  /** How many of the 1M possible tickets match -> chance a random ticket matches. */
  readonly spaceShare = computed(() => {
    const m = this.valid();
    return m ? enumerate(m.key, m.test).length / SPACE : 0;
  });

  readonly hits = computed<WinEntry[]>(() => {
    const m = this.valid();
    return m ? this.data.entries().filter((e) => m.test(e.number)) : [];
  });

  readonly stats = computed<PrizeStat[]>(() => {
    const byPrize = this.data.numbersByPrize();
    const share = this.spaceShare();
    // Map as a counter: prize -> hits, filled in one pass over the hits.
    const hitCount = new Map<number, number>();
    for (const h of this.hits()) hitCount.set(h.prize, (hitCount.get(h.prize) ?? 0) + 1);
    return PRIZES.map((prize) => {
      const hits = hitCount.get(prize) ?? 0;
      const expected = byPrize[prize].length * share;
      const ratio = expected > 0 ? hits / expected : null;
      return {
        prize,
        label: PRIZE_LABEL[prize],
        hits,
        expected,
        ratio,
        barPct: ratio === null ? 0 : (Math.min(ratio, RATIO_MAX) / RATIO_MAX) * 100,
      };
    });
  });

  readonly totalHits = computed(() => this.hits().length);
  readonly totalExpected = computed(() => this.stats().reduce((sum, s) => sum + s.expected, 0));
  readonly totalRatio = computed(() => (this.totalExpected() > 0 ? this.totalHits() / this.totalExpected() : 0));
  readonly summary = computed(() => [
    { label: 'ครั้งที่พบ', value: num.format(this.totalHits()), gold: true },
    { label: 'ครั้งที่คาด', value: this.totalExpected().toFixed(1), gold: false },
    { label: 'พบ / คาด', value: `${this.totalRatio().toFixed(2)}×`, gold: false },
  ]);
  readonly lowExpected = computed(() => this.stats().some((s) => s.expected > 0 && s.expected < 5));

  readonly list = computed(() => {
    const m = this.valid();
    if (!m) return [];
    return this.hits()
      .slice(0, this.expanded() ? MAX_LIST : RECENT)
      .map((h) => {
        const lit = m.highlight(h.number);
        return { ...h, label: PRIZE_LABEL[h.prize], chars: [...h.number].map((ch, i) => ({ ch, hit: lit[i] })) };
      });
  });
  readonly canExpand = computed(() => this.hits().length > RECENT);

  clear() {
    this.query.update((q) => ({ ...q, text: '' }));
  }

  useExample(e: { mode: SearchMode; text: string }) {
    this.query.set(e);
  }
}
