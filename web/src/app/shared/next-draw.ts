import { ChangeDetectionStrategy, Component } from '@angular/core';
import { thaiDate } from './thai-date';

const DAY = 86_400_000;

/**
 * The next scheduled draw date: the 1st or 16th of a month, the first one not before `today`.
 * Pure, so it is easy to test. It knows the regular schedule only; GLO occasionally moves a draw
 * for a holiday (e.g. 17 Jan, 2 May), which the badge says in its tooltip.
 */
export function nextDrawDate(today: Date): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (d <= 1) return new Date(y, m, 1);
  if (d <= 16) return new Date(y, m, 16);
  return new Date(y, m + 1, 1); // Date rolls December + 1 over into January
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "งวดถัดไป 16 พ.ย. 2569 · อีก 7 วัน" - the date lottery buyers plan around. */
@Component({
  selector: 'app-next-draw',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <p
      class="flex items-center gap-2 rounded-full border border-hair bg-surface py-2 pr-3.5 pl-3 text-[13px]"
      title="ตามกำหนดปกติวันที่ 1 และ 16 ของเดือน บางงวดเลื่อนตามวันหยุด"
    >
      <svg class="text-gold" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span class="font-semibold">งวดถัดไป {{ date }}</span>
      <span class="text-ink-2">{{ left }}</span>
    </p>
  `,
})
export class NextDraw {
  private readonly today = new Date();
  private readonly next = nextDrawDate(this.today);
  protected readonly date = thaiDate(iso(this.next));
  protected readonly left = (() => {
    const start = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    const days = Math.round((this.next.getTime() - start.getTime()) / DAY);
    return days === 0 ? 'วันนี้' : `อีก ${days} วัน`;
  })();
}
