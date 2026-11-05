import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CellStat, GridStats } from '../lottery/stats';

/**
 * Heatmap grid, two flavours:
 *  - 'digit': rows = digit 0–9, columns = position (หลัก). Cells are unlabeled.
 *  - 'pair' : rows = tens, columns = units (00–99). Each cell shows its 2-digit number.
 * Colour = z-score on a fixed diverging scale; gold ring = |z| >= 2.
 * Hover/focus is reported up via `inspect` so the parent can show one shared readout.
 */
@Component({
  selector: 'app-heat-grid',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heat-grid.html',
  host: { class: 'block min-w-0' },
})
export class HeatGrid {
  readonly stats = input.required<GridStats>();
  readonly mode = input<'digit' | 'pair'>('digit');
  /** Optional title row above the grid. */
  readonly label = input<string>('');
  /** Fixed cell height in px; default keeps an 11:10 aspect ratio. */
  readonly cellHeight = input<number | null>(null);
  /** Cell to outline (e.g. the one being hovered, or the searched number). */
  readonly active = input<CellStat | null>(null);
  readonly inspect = output<CellStat | null>();

  readonly columns = computed(() => this.stats().cells[0]?.length ?? 0);
  readonly colHeads = computed(() =>
    Array.from({ length: this.columns() }, (_, i) => (this.mode() === 'pair' ? String(i) : String(i + 1))),
  );
  /** Row-label column + N equal columns; built at runtime because N varies (6, 3 or 10). */
  readonly gridStyle = computed(() => `grid-template-columns: 14px repeat(${this.columns()}, minmax(0, 1fr))`);

  readonly rows = computed(() => {
    const pair = this.mode() === 'pair';
    const h = this.cellHeight();
    return this.stats().cells.map((row) =>
      row.map((c) => {
        // Runtime colour: Tailwind can't pre-generate a class per z-score, so this stays inline,
        // reading the same theme variables the utilities use.
        const pole = c.z >= 0 ? 'var(--color-div-pos)' : 'var(--color-div-neg)';
        const sigma = `${c.z >= 0 ? '+' : ''}${c.z.toFixed(1)} σ`;
        return {
          cell: c,
          text: pair ? `${c.digit}${c.pos}` : '',
          style:
            `background-color: color-mix(in oklch, ${pole} ${Math.round(c.strength * 100)}%, var(--color-div-mid))` +
            (h ? `; height: ${h}px` : ''),
          flagged: Math.abs(c.z) >= 2,
          /** dark fill -> white label */
          strong: c.strength > 0.55,
          aria: pair
            ? `เลข ${c.digit}${c.pos}: ${c.count} ครั้ง, ${sigma}`
            : `หลักที่ ${c.pos + 1} เลข ${c.digit}: ${c.count} ครั้ง, ${sigma}`,
        };
      }),
    );
  });
}
