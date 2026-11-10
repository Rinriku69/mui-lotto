import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Diverging colour key (−3σ … +3σ) plus the outline meaning. Purely visual: aria-hidden. */
@Component({
  selector: 'app-heat-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div class="grid w-[200px] justify-items-end gap-1.5">
      <div class="legend-ramp h-2 w-full rounded"></div>
      <div class="flex w-full justify-between text-[11px] text-ink-2"><span>น้อยกว่าคาด</span><span>มากกว่าคาด</span></div>
      <div class="flex items-center gap-1.5 text-[11px] text-ink-2">
        <span class="size-3 rounded-[3px] bg-div-mid inset-ring-[1.5px] inset-ring-ink"></span>กรอบ = เกิน ±2σ
      </div>
    </div>
  `,
})
export class HeatLegend {}
