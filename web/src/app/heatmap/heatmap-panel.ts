import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LotteryData } from '../lottery/lottery-data';
import { PRIZES, PRIZE_LABEL } from '../lottery/lottery.model';
import { CellStat } from '../lottery/stats';
import { HeatGrid } from './heat-grid';
import { HeatLegend } from './heat-legend';

interface Hovered {
  prize: number;
  cell: CellStat;
}

@Component({
  selector: 'app-heatmap-panel',
  imports: [DecimalPipe, HeatGrid, HeatLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heatmap-panel.html',
  host: { class: 'block' },
})
export class HeatmapPanel {
  protected readonly data = inject(LotteryData);
  protected readonly prizes = PRIZES;
  protected readonly prizeLabel = PRIZE_LABEL;

  /** One readout for all five grids, so hovering any cell explains it in the same place. */
  protected readonly hovered = signal<Hovered | null>(null);
  protected readonly hoveredExpected = computed(() => {
    const h = this.hovered();
    return h ? this.data.prizeStats()[h.prize - 1].expected : 0;
  });

  protected inspect(prize: number, cell: CellStat | null) {
    this.hovered.set(cell ? { prize, cell } : null);
  }
}
