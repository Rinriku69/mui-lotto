import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormField, debounce, form, maxLength } from '@angular/forms/signals';
import { LotteryData } from '../lottery/lottery-data';
import { PRIZES, PRIZE_LABEL, WinEntry } from '../lottery/lottery.model';
import { Matcher, SPACE, SearchMode, buildMatcher, enumerate } from '../lottery/number-pattern';

interface PrizeStat {
  prize: number;
  label: string;
  hits: number;
  total: number;
  expected: number;
  ratio: number | null;
  lastSeen: string | null;
}

const MAX_LIST = 120;

@Component({
  selector: 'app-number-search',
  imports: [FormField, DecimalPipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-search.html',
  styleUrl: './number-search.css',
})
export class NumberSearch {
  private readonly data = inject(LotteryData);

  readonly modes: { value: SearchMode; label: string; hint: string }[] = [
    { value: 'anywhere', label: 'ตรงไหนก็ได้', hint: 'เช่น 59 → 159302, 845902' },
    { value: 'suffix', label: 'เลขท้าย', hint: 'เช่น 59 → xxxx59' },
    { value: 'prefix', label: 'เลขหน้า', hint: 'เช่น 59 → 59xxxx' },
    { value: 'position', label: 'ตรงตำแหน่ง', hint: 'x = หลักไหนก็ได้ เช่น x4xx99' },
  ];

  /**
   * Signal form bound straight to the service's signal: the form reads AND writes
   * data.searchQuery, so the generator can set a query and this form just shows it.
   * debounce(): the text box updates the model 250 ms after typing stops,
   * so we don't re-scan 1M tickets on every keystroke.
   */
  readonly searchForm = form(this.data.searchQuery, (p) => {
    debounce(p.text, 250);
    maxLength(p.text, 6);
  });

  readonly hint = computed(() => this.modes.find((m) => m.value === this.data.searchQuery().mode)!.hint);

  readonly matcher = computed<Matcher | string | null>(() => {
    const q = this.data.searchQuery();
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
    const hits = this.hits();
    const share = this.spaceShare();
    return PRIZES.map((prize) => {
      const mine = hits.filter((h) => h.prize === prize);
      const total = byPrize[prize].length;
      const expected = total * share;
      return {
        prize,
        label: PRIZE_LABEL[prize],
        hits: mine.length,
        total,
        expected,
        ratio: expected > 0 ? mine.length / expected : null,
        lastSeen: mine[0]?.date ?? null, // entries are newest first
      };
    });
  });

  readonly totalHits = computed(() => this.hits().length);
  readonly totalExpected = computed(() => this.stats().reduce((sum, s) => sum + s.expected, 0));

  readonly list = computed(() => {
    const m = this.valid();
    if (!m) return [];
    return this.hits()
      .slice(0, MAX_LIST)
      .map((h) => {
        const lit = m.highlight(h.number);
        return { ...h, label: PRIZE_LABEL[h.prize], chars: [...h.number].map((ch, i) => ({ ch, hit: lit[i] })) };
      });
  });
  readonly truncated = computed(() => this.hits().length > MAX_LIST);
}
