import { Injectable, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DrawsFile, WinEntry } from './lottery.model';
import { SearchMode } from './number-pattern';

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
 * heatmaps and search stats automatically - no manual subscribe/refresh wiring.
 */
@Injectable({ providedIn: 'root' })
export class LotteryData {
  /** httpResource = an HTTP GET exposed as signals (value / isLoading / error). */
  readonly file = httpResource<DrawsFile>(() => 'data/draws.json');

  readonly allDraws = computed(() => (this.file.hasValue() ? this.file.value().draws : []));
  readonly firstDate = computed(() => this.allDraws()[0]?.date ?? '');
  readonly lastDate = computed(() => this.allDraws().at(-1)?.date ?? '');

  readonly range = signal<DateRange>({ from: '', to: '' });

  /** Search state lives here (not in the search component) so the generator can hand a number over. */
  readonly searchQuery = signal<SearchQuery>({ mode: 'anywhere', text: '' });

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
}
