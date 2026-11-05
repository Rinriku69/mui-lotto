import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Kpi {
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}

/** Row of summary tiles (4 across on desktop, 2 on small screens). */
@Component({
  selector: 'app-kpi-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="สรุป">
      @for (k of kpis(); track k.label) {
        <div class="flex min-w-0 flex-col gap-1.5 rounded-[10px] border border-hair bg-surface px-[18px] py-4">
          <span class="text-xs text-ink-2">{{ k.label }}</span>
          <strong class="font-mono text-[28px] leading-[1.1] font-bold whitespace-pre" [class]="k.gold ? 'tracking-[0.08em] text-gold' : ''">{{
            k.value
          }}</strong>
          <span class="font-mono text-[11px] text-muted">{{ k.sub }}</span>
        </div>
      }
    </section>
  `,
})
export class KpiRow {
  readonly kpis = input.required<Kpi[]>();
}
