import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Unknown URLs. nginx still answers 200 (SPA fallback), so the `robots: noindex` route data is what
 * keeps these out of Google's index instead of a "soft 404" that duplicates the home page.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel mx-auto mt-16 max-w-md text-center">
      <p class="eyebrow">404</p>
      <h1 class="mt-2 text-2xl font-semibold text-ink">ไม่พบหน้านี้</h1>
      <p class="mt-3 text-ink-2">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
      <a routerLink="/" class="btn-gold mt-6 inline-block">กลับหน้าแรก</a>
    </section>
  `,
})
export class NotFoundPage {}
