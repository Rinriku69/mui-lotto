import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CellStat, PrizeStats } from '../lottery/stats';

/**
 * Compact digit x position grid for one prize (no numbers in cells).
 * Colour = z-score on a fixed diverging scale; gold ring = |z| >= 2.
 * Hover/focus is reported up via `inspect` so the panel shows one shared readout.
 */
@Component({
  selector: 'app-prize-heatmap',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prize-heatmap.html',
  host: { class: 'block min-w-0' },
})
export class PrizeHeatmap {
  readonly label = input.required<string>();
  readonly stats = input.required<PrizeStats>();
  readonly active = input<CellStat | null>(null);
  readonly inspect = output<CellStat | null>();

  readonly positions = [1, 2, 3, 4, 5, 6];

  readonly rows = computed(() =>
    this.stats().cells.map((row) =>
      row.map((c) => {
        // Runtime colour: Tailwind can't pre-generate a class per z-score, so this stays inline,
        // reading the same theme variables the utilities use.
        const pole = c.z >= 0 ? 'var(--color-div-pos)' : 'var(--color-div-neg)';
        return {
          cell: c,
          style: `background-color: color-mix(in oklch, ${pole} ${Math.round(c.strength * 100)}%, var(--color-div-mid))`,
          flagged: Math.abs(c.z) >= 2,
          aria: `หลักที่ ${c.pos + 1} เลข ${c.digit}: ${c.count} ครั้ง, ${c.z >= 0 ? '+' : ''}${c.z.toFixed(1)} σ`,
        };
      }),
    ),
  );
}
