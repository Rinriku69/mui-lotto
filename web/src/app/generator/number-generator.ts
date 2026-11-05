import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, applyEach, debounce, form, max, maxLength, min } from '@angular/forms/signals';
import { LotteryData } from '../lottery/lottery-data';
import { CountOp, DigitRule, GeneratorSpec, SPACE, compileSpec, enumerate, pickRandom } from '../lottery/number-pattern';

interface GeneratorModel extends GeneratorSpec {
  quantity: number;
}

interface Picked {
  number: string;
  timesWon: number; // exact 6-digit hits in the selected date range, any prize
}

@Component({
  selector: 'app-number-generator',
  imports: [FormField, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-generator.html',
  styleUrl: './number-generator.css',
})
export class NumberGenerator {
  private readonly data = inject(LotteryData);

  readonly digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  readonly ops: { value: CountOp; label: string }[] = [
    { value: 'atLeast', label: 'อย่างน้อย' },
    { value: 'exactly', label: 'พอดี' },
    { value: 'atMost', label: 'ไม่เกิน' },
  ];

  readonly model = signal<GeneratorModel>({
    pattern: '',
    contains: '',
    rules: [{ digit: '4', op: 'atLeast', count: 2 }],
    quantity: 5,
  });

  /**
   * The schema is the single owner of input constraints: min()/max()/maxLength() here
   * also stamp the matching HTML attributes on the bound <input>, so the template must not
   * repeat them (Angular errors NG8022 if it does - two sources of truth could disagree).
   */
  readonly genForm = form(this.model, (p) => {
    debounce(p.pattern, 300);
    debounce(p.contains, 300);
    maxLength(p.pattern, 6);
    maxLength(p.contains, 6);
    min(p.quantity, 1);
    max(p.quantity, 20);
    // applyEach = run this sub-schema for every item of the rules array
    applyEach(p.rules, (r) => {
      min(r.count, 0);
      max(r.count, 6);
    });
  });

  /** Compile every rule into one test; recomputes only when the model changes. */
  readonly compiled = computed(() => {
    const { quantity, ...spec } = this.model();
    return compileSpec(spec);
  });
  readonly error = computed(() => (typeof this.compiled() === 'string' ? (this.compiled() as string) : null));

  /** All tickets satisfying the rules: the pool we draw from. */
  readonly pool = computed(() => {
    const c = this.compiled();
    return typeof c === 'string' ? null : enumerate(c.key, c.test);
  });
  readonly poolSize = computed(() => this.pool()?.length ?? 0);
  readonly poolShare = computed(() => this.poolSize() / SPACE);

  readonly picked = signal<Picked[]>([]);

  addRule() {
    this.model.update((m) => ({ ...m, rules: [...m.rules, { digit: '9', op: 'atLeast', count: 1 } satisfies DigitRule] }));
  }

  removeRule(i: number) {
    this.model.update((m) => ({ ...m, rules: m.rules.filter((_, idx) => idx !== i) }));
  }

  roll() {
    const pool = this.pool();
    if (!pool?.length) return;
    // Map as a lookup table: number -> times it won (exact match) in the selected range.
    const wins = new Map<string, number>();
    for (const e of this.data.entries()) wins.set(e.number, (wins.get(e.number) ?? 0) + 1);
    const qty = Math.min(Math.max(1, Number(this.model().quantity) || 1), 20);
    this.picked.set(pickRandom(pool, qty).map((number) => ({ number, timesWon: wins.get(number) ?? 0 })));
  }

  /** Hand a generated number to the search panel and scroll to it. */
  inspect(n: string) {
    this.data.searchQuery.set({ mode: 'anywhere', text: n });
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
