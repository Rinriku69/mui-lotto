import { ChangeDetectionStrategy, Component, ElementRef, computed, input, model, viewChildren } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

/**
 * How the boxes map to the value:
 * - free:  one real input per box, any box can be filled; blanks become 'x' (e.g. "x4xx99").
 * - start: digits flow in from the left  ("61" -> 6 1 _ _ _ _), value = plain digits.
 * - end:   digits flow in from the right ("61" -> _ _ _ _ 6 1), value = plain digits.
 * - grow:  boxes grow with what was typed (position-free search), value = plain digits.
 */
export type SlotMode = 'free' | 'start' | 'end' | 'grow';

/** Characters a pasted pattern may use for "any digit" (same set buildMatcher accepts). */
const BLANK = /[xX?*_\-.\s]/;
const isDigit = (c: string | undefined) => !!c && c >= '0' && c <= '9';

/**
 * A row of digit boxes (Figma component Slot/Digit). It implements FormValueControl, the
 * signal-forms contract for custom controls: exposing a `value` model() is enough for
 * `[formField]` to bind it like a native <input> - debounce, validation and the shared
 * search field all keep working, and the value stays the same string format as before.
 */
@Component({
  selector: 'app-digit-slots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (mode() === 'free') {
      <div class="flex gap-1.5" role="group" [attr.aria-label]="label()" [attr.aria-describedby]="describedBy()">
        @for (i of indexes(); track i) {
          <input
            #cell
            [class]="box() + ' border-hair font-bold text-gold caret-transparent outline-none placeholder:font-normal placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/25'"
            inputmode="numeric"
            autocomplete="off"
            spellcheck="false"
            placeholder="_"
            [value]="cells()[i]"
            [disabled]="disabled()"
            [attr.aria-label]="'หลักที่ ' + (i + 1)"
            (input)="onCellInput(i, $event)"
            (keydown)="onCellKeydown(i, $event)"
            (paste)="onPaste(i, $event)"
            (focus)="selectAll($event)"
          />
        }
      </div>
    } @else {
      <!-- One real (invisible) input on top of display-only boxes: typing, IME, mobile keyboards
           and screen readers all deal with a single ordinary text field. -->
      <!-- group-has-focus: the box where the next digit lands turns gold while the hidden input
           has focus - pure CSS (:has), so no focus signal has to be tracked by hand. -->
      <div class="group relative -m-1 flex items-center gap-1.5 rounded-xl p-1 has-focus:ring-2 has-focus:ring-gold/25">
        @if (showEllipsis()) {
          <span class="font-mono text-xl text-muted" aria-hidden="true">…</span>
        }
        @for (b of flow().boxes; track $index) {
          <span
            aria-hidden="true"
            [class]="box() + ' ' + (b ? 'border-hair font-bold text-gold' : $index === flow().caret ? 'border-hair text-muted group-has-focus:border-gold' : 'border-hair text-muted')"
            >{{ b || '_' }}</span
          >
        }
        @if (showEllipsis()) {
          <span class="font-mono text-xl text-muted" aria-hidden="true">…</span>
        }
        <input
          class="absolute inset-0 size-full cursor-text opacity-0"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          [value]="digitsOnly()"
          [disabled]="disabled()"
          [attr.aria-label]="label()"
          [attr.aria-describedby]="describedBy()"
          (input)="onFlowInput($event)"
        />
      </div>
    }
  `,
})
export class DigitSlots implements FormValueControl<string> {
  /** The bound value. FormField writes into it and listens to it. */
  readonly value = model('');
  /** Picked up automatically from the field state by [formField]. */
  readonly disabled = input(false);

  readonly length = input(6);
  readonly mode = input<SlotMode>('free');
  readonly size = input<'sm' | 'lg'>('sm');
  readonly label = input('ตัวเลข');
  readonly describedBy = input<string | null>(null);

  private readonly cellInputs = viewChildren<ElementRef<HTMLInputElement>>('cell');

  protected readonly indexes = computed(() => Array.from({ length: this.length() }, (_, i) => i));
  protected readonly box = computed(() =>
    (this.size() === 'lg' ? 'h-[58px] w-12 rounded-lg text-[28px]' : 'h-11 w-[34px] rounded-md text-[22px]') +
    ' flex items-center justify-center border bg-surface text-center font-mono',
  );

  /** free mode: what each box holds, '' = wildcard. */
  protected readonly cells = computed(() => {
    const v = this.value();
    return this.indexes().map((i) => (isDigit(v[i]) ? v[i] : ''));
  });

  protected readonly digitsOnly = computed(() => this.value().replace(/\D/g, '').slice(0, this.length()));

  /** flow modes: the boxes to draw and which one receives the next digit (-1 = none). */
  protected readonly flow = computed(() => {
    const chars = [...this.digitsOnly()];
    const n = this.length();
    const free = n - chars.length;
    const blanks = (k: number) => Array<string>(k).fill('');
    switch (this.mode()) {
      case 'end':
        return { boxes: [...blanks(free), ...chars], caret: free > 0 ? n - 1 : -1 };
      case 'start':
        return { boxes: [...chars, ...blanks(free)], caret: free > 0 ? chars.length : -1 };
      default:
        return { boxes: free > 0 ? [...chars, ''] : chars, caret: free > 0 ? chars.length : -1 };
    }
  });
  /** "…" either side says "anywhere in the number"; dropped when full so 6 boxes still fit. */
  protected readonly showEllipsis = computed(() => this.mode() === 'grow' && this.digitsOnly().length < this.length());

  // ---------- free mode ----------

  protected onCellInput(i: number, e: Event) {
    const el = e.target as HTMLInputElement;
    // keep only the newest digit; focus selects the old one, so normally there is just one
    const d = el.value.replace(/\D/g, '').slice(-1);
    // The signal may not change (e.g. a letter was typed into an empty box), in which case
    // Angular won't re-render [value], so reset the DOM value by hand.
    el.value = d;
    this.setCell(i, d);
    if (d) this.focusCell(i + 1);
  }

  protected onCellKeydown(i: number, e: KeyboardEvent) {
    const last = this.length() - 1;
    if (e.key === 'Backspace' && !this.cells()[i] && i > 0) {
      // empty box: step back and clear the previous one, like OTP inputs
      e.preventDefault();
      this.setCell(i - 1, '');
      this.focusCell(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      this.focusCell(i - 1);
    } else if (e.key === 'ArrowRight' && i < last) {
      e.preventDefault();
      this.focusCell(i + 1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      this.focusCell(e.key === 'Home' ? 0 : last);
    }
  }

  /** Paste "x4xx99" or "123456" into any box: spreads across the boxes from there. */
  protected onPaste(i: number, e: ClipboardEvent) {
    e.preventDefault();
    const chars = [...(e.clipboardData?.getData('text') ?? '')].filter((c) => isDigit(c) || BLANK.test(c));
    const next = [...this.cells()];
    const room = this.length() - i;
    chars.slice(0, room).forEach((c, k) => (next[i + k] = isDigit(c) ? c : ''));
    this.writeCells(next);
    this.focusCell(Math.min(i + chars.length, this.length() - 1));
  }

  protected selectAll(e: FocusEvent) {
    (e.target as HTMLInputElement).select();
  }

  private setCell(i: number, d: string) {
    const next = [...this.cells()];
    next[i] = d;
    this.writeCells(next);
  }

  /** Blanks become 'x'; all blank means "no constraint", stored as ''. */
  private writeCells(cells: string[]) {
    this.value.set(cells.some(Boolean) ? cells.map((c) => c || 'x').join('') : '');
  }

  private focusCell(i: number) {
    const el = this.cellInputs()[i]?.nativeElement;
    el?.focus();
    el?.select();
  }

  // ---------- flow modes ----------

  protected onFlowInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(0, this.length());
    el.value = v;
    this.value.set(v);
  }
}
