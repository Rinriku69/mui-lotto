import { Injectable, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { debounce, form, maxLength } from '@angular/forms/signals';
import { DrawsFile, PRIZES, SPECIAL_KINDS, SpecialEntry, SpecialKind, WinEntry } from './lottery.model';
import { SearchMode } from './number-pattern';
import { BEYOND2_SHARE, CELLS_PER_PRIZE, digitPositionStats, twoDigitStats } from './stats';

export interface DateRange {
  from: string; // '' = open-ended
  to: string;
}

export interface SearchQuery {
  mode: SearchMode;
  text: string;
}

/**
 * Single source of truth for the dashboard.
 * Everything downstream is a `computed()`, so changing the date range re-derives
 * heatmaps, KPIs and search stats automatically - no manual subscribe/refresh wiring.
 */
@Injectable({ providedIn: 'root' })
export class LotteryData {
  /** httpResource = an HTTP GET exposed as signals (value / isLoading / error). */
  readonly file = httpResource<DrawsFile>(() => 'data/draws.json');

  readonly allDraws = computed(() => (this.file.hasValue() ? this.file.value().draws : []));
  readonly firstDate = computed(() => this.allDraws()[0]?.date ?? '');
  readonly lastDate = computed(() => this.allDraws().at(-1)?.date ?? '');

  readonly range = signal<DateRange>({ from: '', to: '' });

  /** Search state lives here so the command bar, the inspector and the generator share it. */
  readonly searchQuery = signal<SearchQuery>({ mode: 'suffix', text: '' });

  /**
   * One signal form, bound from two places (command bar + inspector): both inputs edit the
   * same field, so they can never disagree. form() needs an injection context, which a
   * service field initializer has. debounce(): the model updates 250 ms after typing stops,
   * so we don't re-scan 1M tickets on every keystroke.
   */
  readonly searchForm = form(this.searchQuery, (p) => {
    debounce(p.text, 250);
    maxLength(p.text, 6);
  });

  readonly draws = computed(() => {
    const { from, to } = this.range();
    return this.allDraws().filter((d) => (!from || d.date >= from) && (!to || d.date <= to));
  });

  /** Flat list of every winning number in range, newest first. */
  readonly entries = computed<WinEntry[]>(() => {
    const out: WinEntry[] = [];
    const draws = this.draws();
    for (let i = draws.length - 1; i >= 0; i--) {
      const d = draws[i];
      d.prizes.forEach((nums, idx) => {
        for (const number of nums) out.push({ date: d.date, prize: idx + 1, number });
      });
    }
    return out;
  });

  /**
   * prize -> its numbers. Built with reduce():
   * reduce walks the array carrying an "accumulator" (here an object of 5 empty lists)
   * and each step pushes the current entry into the right list, then returns the accumulator
   * so the next step receives it. One pass instead of filtering the big list 5 times.
   */
  readonly numbersByPrize = computed(() =>
    this.entries().reduce<Record<number, string[]>>(
      (acc, e) => {
        acc[e.prize].push(e.number);
        return acc;
      },
      { 1: [], 2: [], 3: [], 4: [], 5: [] },
    ),
  );

  /** Digit x position stats per prize (index 0 = รางวัลที่ 1). Feeds heatmaps and KPIs. */
  readonly prizeStats = computed(() => PRIZES.map((p) => digitPositionStats(this.numbersByPrize()[p])));

  readonly beyond2Total = computed(() => this.prizeStats().reduce((sum, s) => sum + s.beyond2, 0));
  readonly beyond2Expected = PRIZES.length * CELLS_PER_PRIZE * BEYOND2_SHARE;

  // ---------- เลขหน้า 3 ตัว / เลขท้าย 3 ตัว / เลขท้าย 2 ตัว ----------

  /** Flat list of special-prize numbers in range, newest first. */
  readonly specialEntries = computed<SpecialEntry[]>(() => {
    const out: SpecialEntry[] = [];
    const draws = this.draws();
    for (let i = draws.length - 1; i >= 0; i--) {
      const d = draws[i];
      for (const kind of SPECIAL_KINDS) for (const number of d.special[kind]) out.push({ date: d.date, kind, number });
    }
    return out;
  });

  /** kind -> its numbers, same reduce() pattern as numbersByPrize. */
  readonly specialByKind = computed(() =>
    this.specialEntries().reduce<Record<SpecialKind, string[]>>(
      (acc, e) => {
        acc[e.kind].push(e.number);
        return acc;
      },
      { front3: [], last3: [], last2: [] },
    ),
  );

  readonly last2Stats = computed(() => twoDigitStats(this.specialByKind().last2));
  readonly front3Stats = computed(() => digitPositionStats(this.specialByKind().front3, 3));
  readonly last3Stats = computed(() => digitPositionStats(this.specialByKind().last3, 3));
  /** Draws in range that actually had a front-3 prize (none before Sep 2015). */
  readonly front3Draws = computed(() => this.draws().filter((d) => d.special.front3.length).length);
}
