import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Two-column page body: main content + sticky inspector on wide screens, stacked below 1100px.
 * Content projection: children go to the main column, an element marked `aside` goes right.
 *
 * `heading` becomes the page's single <h1> and `lead` the line under it. Both are visible text on
 * purpose: Google weighs what users can see (h1, first paragraph) far more than <meta> tags, so the
 * search phrases a page should rank for ("สุ่มเลขหวย", "สถิติเลขท้าย 2 ตัว"...) have to live here.
 */
@Component({
  selector: 'app-page-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header class="mx-auto max-w-[1600px] px-8 pt-6">
      <h1 class="text-2xl font-semibold text-ink">{{ heading() }}</h1>
      <p class="mt-1 max-w-[80ch] text-sm text-ink-2">{{ lead() }}</p>
    </header>
    <div class="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-8 pt-5 pb-8 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
      <main class="flex min-w-0 flex-col gap-5"><ng-content /></main>
      <aside
        class="self-start rounded-xl min-[1100px]:sticky min-[1100px]:top-[88px] min-[1100px]:max-h-[calc(100vh-108px)] min-[1100px]:overflow-auto"
      >
        <ng-content select="[aside]" />
      </aside>
    </div>
  `,
})
export class PageLayout {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
}
