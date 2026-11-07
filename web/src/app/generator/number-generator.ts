import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField, applyEach, debounce, form, max, maxLength, min } from '@angular/forms/signals';
import { LotteryData } from '../lottery/lottery-data';
import { CountOp, DigitRule, GeneratorSpec, SPACE, compileSpec, enumerate, pickRandom } from '../lottery/number-pattern';
import { DigitSlots } from '../shared/digit-slots';

const MAX_QUANTITY = 20;

interface GeneratorModel extends GeneratorSpec {
  quantity: number;
}

interface Picked {
  number: string;
  timesWon: number; // exact 6-digit hits in the selected date range, any prize
}

@Component({
  selector: 'app-number-generator',
  imports: [FormField, DecimalPipe, DigitSlots],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-generator.html',
  host: { class: 'block' },
})
export class NumberGenerator {
  private readonly data = inject(LotteryData);

  /**
   * Class strings for the rule chips. They repeat many times but only in this template, so a
   * local constant keeps one source of truth without adding more global @utility names.
   * Kept as full literal strings so Tailwind's scanner can see every class.
   * Border colour is deliberately NOT in the base: two border-* colour classes on one element
   * resolve by stylesheet order, not attribute order, so each chip adds exactly one colour.
   */
  private readonly chipBase =
    'inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border bg-raised px-3 py-1.5 text-sm font-medium';
  protected readonly chip = `${this.chipBase} border-hair focus-within:border-gold`;
  protected readonly chipActive = `${this.chipBase} border-gold`;
  protected readonly chipAdd = `${this.chipBase} border-hair cursor-pointer bg-transparent hover:border-muted`;
  protected readonly chipInput = 'rounded bg-transparent px-1 py-0.5 font-mono outline-none placeholder:text-muted';
  protected readonly chipSelect = 'cursor-pointer appearance-none rounded bg-surface px-2 py-0.5 outline-none';
  protected readonly stepBtn =
    'cursor-pointer px-3 font-mono text-base text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40';
  protected readonly maxQuantity = MAX_QUANTITY;

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
    // No debounce on pattern: slot edits are discrete (one digit per event) and the roll button
    // sits right beside them - a pending debounce would let roll() draw from the previous pool.
    debounce(p.contains, 300);
    maxLength(p.pattern, 6);
    maxLength(p.contains, 6);
    min(p.quantity, 1);
    max(p.quantity, MAX_QUANTITY);
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
  /** Meter width: at least a sliver when the pool is non-empty but tiny, so it never looks broken. */
  readonly meterPct = computed(() => (this.poolSize() ? Math.max(this.poolShare() * 100, 0.4) : 0));
  readonly quantity = computed(() => clampQuantity(this.model().quantity));

  readonly picked = signal<Picked[]>([]);

  /** − / + stepper: always lands inside 1..MAX_QUANTITY, so the schema's min/max never trip. */
  step(delta: number) {
    this.model.update((m) => ({ ...m, quantity: clampQuantity(m.quantity + delta) }));
  }

  clearPattern() {
    this.model.update((m) => ({ ...m, pattern: '' }));
  }

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
    this.picked.set(pickRandom(pool, this.quantity()).map((number) => ({ number, timesWon: wins.get(number) ?? 0 })));
  }

  /** Hand a generated number to the search panel and scroll to it. */
  inspect(n: string) {
    this.data.searchQuery.set({ mode: 'anywhere', text: n });
    // 'nearest': on desktop the inspector is already on screen, so this is a no-op there
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clampQuantity(q: number) {
  return Math.min(Math.max(1, Number(q) || 1), MAX_QUANTITY);
}
