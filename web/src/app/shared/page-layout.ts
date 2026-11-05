import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Two-column page body: main content + sticky inspector on wide screens, stacked below 1100px.
 * Content projection: children go to the main column, an element marked `aside` goes right.
 */
@Component({
  selector: 'app-page-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-8 pt-6 pb-8 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
      <main class="flex min-w-0 flex-col gap-5"><ng-content /></main>
      <aside
        class="self-start rounded-xl min-[1100px]:sticky min-[1100px]:top-[88px] min-[1100px]:max-h-[calc(100vh-108px)] min-[1100px]:overflow-auto"
      >
        <ng-content select="[aside]" />
      </aside>
    </div>
  `,
})
export class PageLayout {}
