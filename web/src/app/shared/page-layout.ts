import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NextDraw } from './next-draw';
import { RangePicker } from './range-picker';

/**
 * Page body with three projected areas:
 *   [top]   - the page's main tool (generator, or the KPI row on /special)
 *   [aside] - the inspector
 *   rest    - everything else (stats)
 * Desktop (xl): two columns, top + rest on the left, inspector sticky on the right.
 * Below xl: one column in the order top -> inspector -> rest, so looking a number up never
 * means scrolling past every stats card first. grid-template-areas does the reordering, so the
 * DOM order (and the screen-reader order) stays the same at every width.
 *
 * `heading` becomes the page's single <h1> and `lead` the line under it. Both are visible text on
 * purpose: Google weighs what users can see (h1, first paragraph) far more than <meta> tags, so the
 * search phrases a page should rank for ("สุ่มเลขหวย", "สถิติเลขท้าย 2 ตัว"...) have to live here.
 */
@Component({
  selector: 'app-page-layout',
  imports: [RangePicker, NextDraw],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header class="mx-auto flex max-w-[1600px] flex-col gap-x-6 gap-y-3 px-4 pt-5 sm:flex-row sm:flex-wrap sm:items-end sm:px-7 lg:pt-6">
      <div class="min-w-0 sm:flex-1">
        <h1 class="text-xl font-bold text-ink sm:text-[26px] sm:leading-tight">{{ heading() }}</h1>
        <p class="mt-1 max-w-[80ch] text-sm text-ink-2">{{ lead() }}</p>
      </div>
      <app-next-draw />
    </header>
    <main
      class="mx-auto grid max-w-[1600px] gap-5 px-4 pt-5 pb-8 [grid-template-areas:'top'_'aside'_'rest'] sm:px-7 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[auto_1fr] xl:[grid-template-areas:'top_aside'_'rest_aside']"
    >
      <div class="flex min-w-0 flex-col gap-5 [grid-area:top]"><ng-content select="[top]" /></div>
      <aside class="self-start [grid-area:aside] xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)] xl:overflow-auto xl:rounded-[14px]">
        <ng-content select="[aside]" />
      </aside>
      <div class="flex min-w-0 flex-col gap-5 [grid-area:rest]">
        <!-- mobile/tablet only: the sidebar (and its range picker) is hidden below lg -->
        <app-range-picker class="lg:hidden" [compact]="true" />
        <ng-content />
      </div>
    </main>
  `,
})
export class PageLayout {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
}
