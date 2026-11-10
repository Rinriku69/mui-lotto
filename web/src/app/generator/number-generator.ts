import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
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
  imports: [FormField, DecimalPipe, NgTemplateOutlet, DigitSlots],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-generator.html',
  host: { class: 'block' },
})
export class NumberGenerator {
  private readonly data = inject(LotteryData);

  /**
   * Class strings that repeat inside this template only, so a local constant keeps one source of
   * truth without adding more global @utility names. Full literal strings, so Tailwind's scanner
   * sees every class. No string sets the same property twice (e.g. two border colours).
   */
  protected readonly chip =
    'inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-hair bg-surface py-1 pr-2 pl-3 text-[13px] font-medium';
  protected readonly chipInput = 'rounded bg-transparent px-1 py-0.5 font-mono outline-none placeholder:text-muted';
  protected readonly chipSelect = 'cursor-pointer appearance-none rounded bg-raised px-2 py-0.5 outline-none';
  protected readonly stepBtn =
    'cursor-pointer px-3.5 font-mono text-lg text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30';
  protected readonly rollBtn =
    'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-l-[10px] bg-gold px-5 py-3 text-base font-semibold whitespace-nowrap text-on-gold hover:bg-[color-mix(in_oklch,var(--color-gold)_88%,white)] disabled:cursor-not-allowed disabled:opacity-40';
  protected readonly actionBtn =
    'flex cursor-pointer items-center gap-1.5 rounded-lg border border-hair bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink';
  /** padding/background come from the caller (thumb-sized on mobile, compact on tickets) */
  protected readonly iconBtn = 'grid cursor-pointer place-items-center rounded-lg text-ink-2 hover:text-ink';
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
    // contains keeps its debounce (free typing; each commit re-enumerates up to 1,000,000
    // tickets) - roll() flushes it first, see there.
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
  readonly rolledAt = signal('');
  readonly noneWon = computed(() => this.picked().every((p) => !p.timesWon));
  readonly allNumbers = computed(() => this.picked().map((p) => p.number).join(' '));

  /** Why the pool is empty, in words, plus a one-click fix when a single rule is the cause. */
  readonly emptyReason = computed(() => explainEmpty(this.model()));

  /** Copy/share confirmation text; cleared after 2 s. */
  readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

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
    // Race: debounce(contains, 300) parks each keystroke in the field's controlValue (what the
    // <input> shows) and only copies it into model() 300 ms later. pool() is computed from model(),
    // so a roll inside that window would draw from the *previous* contains value.
    // markAsTouched() is the framework's own flush: it aborts the pending debounce timer and
    // commits controlValue -> model synchronously (it's what the input's blur handler calls).
    // A mouse click normally blurs the input on mousedown (which already flushes), but focus
    // behaviour on click varies by browser/assistive tech, so roll() flushes explicitly instead of
    // relying on it. When nothing is pending this is a no-op apart from setting touched.
    this.genForm.contains().markAsTouched();
    const pool = this.pool(); // read AFTER the flush, so it sees the committed contains value
    if (!pool?.length) return;
    // Map as a lookup table: number -> times it won (exact match) in the selected range.
    const wins = new Map<string, number>();
    for (const e of this.data.entries()) wins.set(e.number, (wins.get(e.number) ?? 0) + 1);
    this.picked.set(pickRandom(pool, this.quantity()).map((number) => ({ number, timesWon: wins.get(number) ?? 0 })));
    this.rolledAt.set(TIME.format(new Date()));
  }

  applyFix(f: Fix) {
    if (f.count === null) return this.removeRule(f.rule);
    const count = f.count;
    this.model.update((m) => ({ ...m, rules: m.rules.map((r, i) => (i === f.rule ? { ...r, count } : r)) }));
  }

  copy(text: string, done: string) {
    // clipboard API is async and can be refused (no permission / insecure context)
    navigator.clipboard.writeText(text).then(
      () => this.flash(done),
      () => this.flash('คัดลอกไม่สำเร็จ'),
    );
  }

  /** Native share sheet (LINE, Messages...) where the browser has one; otherwise copy a ready-made message. */
  share(numbers: string) {
    const text = `เลขที่สุ่มจาก Mui Lotto: ${numbers}`;
    const url = location.origin;
    if (navigator.share) {
      // rejects with AbortError when the user just closes the sheet - nothing to report
      navigator.share({ text, url }).catch(() => undefined);
    } else {
      this.copy(`${text} ${url}`, 'คัดลอกข้อความสำหรับแชร์แล้ว');
    }
  }

  private flash(msg: string) {
    this.toast.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2000);
  }

  /** Hand a generated number to the search panel and scroll to it. */
  inspect(n: string) {
    this.data.searchQuery.set({ mode: 'anywhere', text: n });
    // 'nearest': on desktop the inspector is already on screen, so this is a no-op there
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

const TIME = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

/** count null = remove the rule (it can never hold, e.g. "at least N" with no free slot). */
interface Fix {
  rule: number;
  count: number | null;
  label: string;
}

/**
 * Explain an empty pool. The common cause is one digit rule fighting the locked slots, e.g.
 * pattern x4xx99 (3 slots free) + "มีเลข 8 อย่างน้อย 4 ตัว": at most 3 eights fit. Those cases get
 * a precise sentence and a fix; anything subtler (rules fighting each other, the digit set)
 * falls back to a general hint rather than a guess.
 */
function explainEmpty(spec: GeneratorSpec): { text: string; fix?: Fix } {
  const locked = [...spec.pattern].filter((c) => c >= '0' && c <= '9');
  const free = 6 - locked.length;
  const lockedNote = locked.length ? `ล็อกไว้ ${locked.length} หลักแล้ว เหลือว่าง ${free} หลัก ` : '';
  for (const [i, r] of spec.rules.entries()) {
    const have = locked.filter((c) => c === r.digit).length; // already fixed by the pattern
    const most = have + free; // if every free slot became this digit
    if ((r.op === 'atLeast' || r.op === 'exactly') && r.count > most) {
      const op = r.op === 'atLeast' ? 'อย่างน้อย' : 'พอดี';
      return {
        text: `${lockedNote}จึงมีเลข ${r.digit} ได้ไม่เกิน ${most} ตัว`,
        fix: most ? { rule: i, count: most, label: `เปลี่ยนเป็น "${op} ${most} ตัว"` } : { rule: i, count: null, label: 'ลบเงื่อนไขนี้' },
      };
    }
    if ((r.op === 'atMost' || r.op === 'exactly') && r.count < have) {
      const op = r.op === 'atMost' ? 'ไม่เกิน' : 'พอดี';
      return {
        text: `ช่องตำแหน่งมีเลข ${r.digit} อยู่แล้ว ${have} ตัว จึง "${op} ${r.count} ตัว" ไม่ได้`,
        fix: { rule: i, count: have, label: `เปลี่ยนเป็น "${op} ${have} ตัว"` },
      };
    }
  }
  return { text: 'ไม่มีเลขที่เข้าทุกเงื่อนไขพร้อมกัน ลองลบบางเงื่อนไข หรือปล่อยช่องตำแหน่งให้ว่างมากขึ้น' };
}

function clampQuantity(q: number) {
  return Math.min(Math.max(1, Number(q) || 1), MAX_QUANTITY);
}
