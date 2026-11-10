import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Kpi {
  label: string;
  value: string;
  sub: string;
}

/**
 * Row of summary tiles (Figma KPI/Card): one row on desktop whatever the count, 2 per row on phones.
 * No gold here: gold is reserved for the visitor's own numbers (pattern, picks, search hits).
 */
@Component({
  selector: 'app-kpi-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="grid grid-cols-2 gap-3 md:auto-cols-fr md:grid-flow-col" aria-label="สรุป">
      @for (k of kpis(); track k.label) {
        <div class="flex min-w-0 flex-col gap-1 rounded-xl border border-hair bg-surface px-[18px] py-4">
          <span class="text-xs font-medium text-ink-2">{{ k.label }}</span>
          <strong class="font-mono text-[26px] leading-tight font-bold whitespace-pre">{{ k.value }}</strong>
          <span class="text-xs text-muted">{{ k.sub }}</span>
        </div>
      }
    </section>
  `,
})
export class KpiRow {
  readonly kpis = input.required<Kpi[]>();
}
