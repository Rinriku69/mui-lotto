import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Diverging colour key (−3σ … +3σ) plus the gold-ring meaning. Purely visual: aria-hidden. */
@Component({
  selector: 'app-heat-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div class="grid w-[200px] justify-items-end gap-1.5">
      <div class="legend-ramp h-2 w-full rounded"></div>
      <div class="flex w-full justify-between font-mono text-[11px] text-muted"><span>−3σ</span><span>0</span><span>+3σ</span></div>
      <div class="flex items-center gap-1.5 text-[11px] text-ink-2">
        <span class="h-2.5 w-3 rounded-sm bg-div-mid inset-ring-[1.5px] inset-ring-gold"></span>ขอบทอง = เกิน ±2σ
      </div>
    </div>
  `,
})
export class HeatLegend {}
