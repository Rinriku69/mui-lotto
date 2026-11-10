import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { LotteryData, RangePreset } from '../lottery/lottery-data';
import { PRIZES, PRIZE_LABEL, SPECIAL_DIGITS, SPECIAL_KINDS, SPECIAL_LABEL } from '../lottery/lottery.model';
import { Matcher, SearchMode, buildMatcher, matchShare } from '../lottery/number-pattern';
import { DigitSlots, SlotMode } from '../shared/digit-slots';
import { thaiDate } from '../shared/thai-date';

/** Lookup table: search mode -> slot behaviour. A Record makes the compiler check every mode is covered. */
const SLOT_MODE: Record<SearchMode, SlotMode> = {
  anywhere: 'grow',
  suffix: 'end',
  prefix: 'start',
  position: 'free',
};

/** Which tab the inspector serves. The query itself is shared (LotteryData.searchQuery). */
export type SearchScope = 'main' | 'special';

/** One row of the bullet chart: a prize (1–5) or a special kind (front3/last3/last2). */
interface Group {
  id: string;
  label: string;
  digits: number;
  /** how many numbers of this group are in the selected range */
  count: number;
}

interface Hit {
  date: string;
  group: string;
  number: string;
}

interface GroupStat extends Group {
  hits: number;
  expected: number;
  ratio: number | null;
  /** bar width in % of the track; the track spans ratio 0 .. RATIO_MAX */
  barPct: number;
}

const RANGE_LABEL: Record<RangePreset, string> = { all: 'ทั้งหมด', '10y': '10 ปีล่าสุด', '5y': '5 ปีล่าสุด', '1y': '1 ปีล่าสุด', custom: 'กำหนดเอง' };

const RECENT = 7;
const MAX_LIST = 120;
/** Bullet chart scale: ratio 0..1.6, so the "expected" tick (ratio 1) sits at 62.5%. */
const RATIO_MAX = 1.6;
const num = new Intl.NumberFormat('en-US');

/**
 * The Thai label already names the mode, so the hint under the pills only shows an example
 * (repeating "เลขท้าย · ..." right under a "เลขท้าย" pill would say the same thing twice).
 */
const ALL_MODES: { value: SearchMode; label: string; main: string; special: string }[] = [
  { value: 'anywhere', label: 'ตรงไหนก็ได้', main: 'เช่น 59 → 159302, 845902', special: 'เช่น 61 → 612, 361, 61' },
  { value: 'suffix', label: 'เลขท้าย', main: 'เช่น 59 → 123459, 000059', special: 'เช่น 61 → 361, 61' },
  { value: 'prefix', label: 'เลขหน้า', main: 'เช่น 59 → 591234, 590000', special: 'เช่น 61 → 612, 61' },
  { value: 'position', label: 'ตรงตามตำแหน่ง', main: 'ช่องว่าง = หลักไหนก็ได้', special: '' },
];

@Component({
  selector: 'app-number-search',
  imports: [FormField, DecimalPipe, DigitSlots],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-search.html',
  host: { class: 'block' },
})
export class NumberSearch {
  private readonly data = inject(LotteryData);
  protected readonly searchForm = this.data.searchForm;

  readonly scope = input<SearchScope>('main');
  protected readonly special = computed(() => this.scope() === 'special');

  /** POS mode needs 6-digit tickets, so the special tab doesn't offer it. */
  readonly modes = computed(() => ALL_MODES.filter((m) => !this.special() || m.value !== 'position'));
  readonly examples = computed(() =>
    this.special()
      ? [
          { mode: 'suffix' as const, text: '61' },
          { mode: 'anywhere' as const, text: '99' },
          { mode: 'prefix' as const, text: '5' },
        ]
      : [
          { mode: 'suffix' as const, text: '61' },
          { mode: 'anywhere' as const, text: '888' },
          { mode: 'position' as const, text: 'x4xx99' },
        ],
  );
  readonly tickPct = (1 / RATIO_MAX) * 100;

  readonly expanded = signal(false);

  readonly query = this.data.searchQuery;
  readonly hint = computed(() => {
    const m = ALL_MODES.find((x) => x.value === this.query().mode)!;
    return this.special() ? m.special : m.main;
  });

  /** Number length this tab searches: 6-digit prizes, or the 3-digit specials (last2 fits inside). */
  readonly digits = computed(() => (this.special() ? 3 : 6));

  /** How the slot boxes behave per search mode (see Figma "Spec · Search slots by mode"). */
  readonly slotMode = computed<SlotMode>(() => SLOT_MODE[this.query().mode]);

  readonly matcher = computed<Matcher | string | null>(() => {
    const q = this.query();
    if (this.special() && q.mode === 'position') return 'โหมดตรงตามตำแหน่งใช้กับรางวัลที่ 1–5 เท่านั้น เลือก ตรงไหนก็ได้ / เลขท้าย / เลขหน้า';
    return buildMatcher(q.mode, q.text);
  });
  readonly error = computed(() => {
    const m = this.matcher();
    return typeof m === 'string' ? m : null;
  });
  private readonly valid = computed(() => {
    const m = this.matcher();
    return m && typeof m !== 'string' ? m : null;
  });

  private readonly groups = computed<Group[]>(() => {
    if (this.special()) {
      const byKind = this.data.specialByKind();
      return SPECIAL_KINDS.map((k) => ({ id: k, label: SPECIAL_LABEL[k], digits: SPECIAL_DIGITS[k], count: byKind[k].length }));
    }
    const byPrize = this.data.numbersByPrize();
    return PRIZES.map((p) => ({ id: String(p), label: PRIZE_LABEL[p], digits: 6, count: byPrize[p].length }));
  });
  private readonly labelOf = computed(() => new Map(this.groups().map((g) => [g.id, g.label])));

  readonly hits = computed<Hit[]>(() => {
    const m = this.valid();
    if (!m) return [];
    return this.special()
      ? this.data.specialEntries().filter((e) => m.test(e.number)).map((e) => ({ date: e.date, group: e.kind, number: e.number }))
      : this.data.entries().filter((e) => m.test(e.number)).map((e) => ({ date: e.date, group: String(e.prize), number: e.number }));
  });

  readonly stats = computed<GroupStat[]>(() => {
    const m = this.valid();
    // Map as a counter: group -> hits, filled in one pass over the hits.
    const hitCount = new Map<string, number>();
    for (const h of this.hits()) hitCount.set(h.group, (hitCount.get(h.group) ?? 0) + 1);
    return this.groups().map((g) => {
      const hits = hitCount.get(g.id) ?? 0;
      // chance that one random number of this length matches, computed exactly by enumeration
      const expected = m ? g.count * matchShare(m, g.digits) : 0;
      const ratio = expected > 0 ? hits / expected : null;
      return { ...g, hits, expected, ratio, barPct: ratio === null ? 0 : (Math.min(ratio, RATIO_MAX) / RATIO_MAX) * 100 };
    });
  });

  readonly totalHits = computed(() => this.hits().length);
  readonly totalExpected = computed(() => this.stats().reduce((sum, s) => sum + s.expected, 0));
  readonly totalRatio = computed(() => (this.totalExpected() > 0 ? this.totalHits() / this.totalExpected() : 0));
  readonly summary = computed(() => [
    { label: 'ครั้งที่พบ', value: num.format(this.totalHits()), gold: true },
    { label: 'ครั้งที่คาด', value: this.totalExpected().toFixed(1), gold: false },
    { label: 'พบ / คาด', value: this.totalHits() || this.totalExpected() >= 1 ? `${this.totalRatio().toFixed(2)}×` : '—', gold: false },
  ]);

  /** Which slice of history the numbers come from - the range control may be far away (mobile). */
  readonly rangeLabel = computed(() => RANGE_LABEL[this.data.rangePreset()]);
  readonly drawCount = computed(() => this.data.draws().length);

  modeLabel(m: SearchMode) {
    return ALL_MODES.find((x) => x.value === m)!.label;
  }

  /** "+27%" / "−11%": the bar's direction in text too, so colour is never the only signal. */
  pct(ratio: number | null) {
    if (ratio === null) return '—';
    const p = Math.round((ratio - 1) * 100);
    return p > 0 ? `+${p}%` : p < 0 ? `−${-p}%` : '0%';
  }
  readonly lowExpected = computed(() => this.stats().some((s) => s.expected > 0 && s.expected < 5));

  readonly list = computed(() => {
    const m = this.valid();
    if (!m) return [];
    const labels = this.labelOf();
    return this.hits()
      .slice(0, this.expanded() ? MAX_LIST : RECENT)
      .map((h) => {
        const lit = m.highlight(h.number);
        return { ...h, thaiDate: thaiDate(h.date), label: labels.get(h.group) ?? '', chars: [...h.number].map((ch, i) => ({ ch, hit: lit[i] })) };
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
