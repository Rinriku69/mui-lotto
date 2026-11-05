import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface Cell {
  pos: number; // 0..5  (หลักที่ 1..6)
  digit: number; // 0..9
  count: number;
  z: number;
  style: string;
  strong: boolean; // dark fill -> needs white ink
}

const Z_CLIP = 3;

/**
 * Digit x position heatmap for one prize.
 *
 * Color encodes the z-score  z = (observed - expected) / SD,  not the raw count.
 * Why: a raw-count heatmap auto-scales min..max, so even PURE random noise gets painted
 * full dark-to-light and looks like a pattern. The z-score is on a fixed scale:
 * |z| < 2 is everyday noise and stays near gray; only genuinely surprising cells get color.
 */
@Component({
  selector: 'app-prize-heatmap',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prize-heatmap.html',
  styleUrl: './prize-heatmap.css',
})
export class PrizeHeatmap {
  readonly label = input.required<string>();
  readonly numbers = input.required<string[]>();

  readonly positions = [0, 1, 2, 3, 4, 5];
  readonly digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  readonly total = computed(() => this.numbers().length);
  /** Each digit should appear in a given slot 1/10 of the time. */
  readonly expected = computed(() => this.total() / 10);
  /** Binomial SD: sqrt(n * p * (1-p)) with p = 0.1 */
  readonly sd = computed(() => Math.sqrt(this.total() * 0.1 * 0.9));

  readonly cells = computed<Cell[][]>(() => {
    // counts[pos][digit], filled in one pass over all numbers
    const counts = this.positions.map(() => Array<number>(10).fill(0));
    for (const n of this.numbers()) {
      for (let p = 0; p < 6; p++) counts[p][n.charCodeAt(p) - 48]++; // '0' is char code 48
    }
    const e = this.expected();
    const sd = this.sd() || 1;
    // rows = digits, columns = positions (read a ticket left to right)
    return this.digits.map((digit) =>
      this.positions.map((pos) => {
        const count = counts[pos][digit];
        const z = (count - e) / sd;
        // Squared so everyday noise stays quiet: |z|=1 -> 11% color, 2 -> 44%, 3+ -> 100%.
        const t = (Math.min(Math.abs(z), Z_CLIP) / Z_CLIP) ** 2;
        const pole = z >= 0 ? 'var(--div-pos)' : 'var(--div-neg)';
        return {
          pos,
          digit,
          count,
          z,
          style: `background-color: color-mix(in oklch, ${pole} ${Math.round(t * 100)}%, var(--div-mid))`,
          strong: t > 0.55, // |z| > ~2.2: fill is dark enough to need white ink
        };
      }),
    );
  });

  /** Under a fair draw ~4.55% of cells land beyond ±2σ by chance alone. */
  readonly beyond2 = computed(() => this.cells().flat().filter((c) => Math.abs(c.z) >= 2).length);
  readonly expectedBeyond2 = 60 * 0.0455;

  readonly hovered = signal<Cell | null>(null);
}
