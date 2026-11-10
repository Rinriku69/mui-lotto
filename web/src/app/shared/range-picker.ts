import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormField } from '@angular/forms/signals';
import { LotteryData, RangePreset } from '../lottery/lottery-data';
import { thaiDate } from './thai-date';

/**
 * Date-range control: preset segmented buttons + "กำหนดช่วงเอง" (custom from/to).
 * Rendered twice - in the desktop sidebar and inside the page on mobile - and both copies read
 * and write LotteryData, so they always agree.
 */
@Component({
  selector: 'app-range-picker',
  imports: [FormField, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  template: `
    <div class="flex items-center gap-2">
      <div class="segmented flex-1" role="group" aria-label="ช่วงข้อมูล">
        @for (p of presets; track p.id) {
          <button type="button" class="seg text-[13px]" [attr.aria-pressed]="data.rangePreset() === p.id" (click)="data.applyPreset(p.id)">
            {{ p.label }}
          </button>
        }
      </div>
      @if (compact()) {
        <button type="button" [class]="calBtn" [attr.aria-pressed]="custom()" aria-label="กำหนดช่วงเอง" (click)="data.rangePreset.set('custom')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      }
    </div>
    @if (!compact()) {
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-medium text-ink-2 hover:text-ink aria-pressed:text-ink"
        [attr.aria-pressed]="custom()"
        (click)="data.rangePreset.set('custom')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        กำหนดช่วงเอง
      </button>
    }
    @if (custom()) {
      <div class="flex flex-wrap gap-x-3 gap-y-2 text-xs text-ink-2" role="group" aria-label="ช่วงวันที่">
        <label class="flex items-center gap-1.5">ตั้งแต่ <input type="date" [formField]="data.rangeForm.from" /></label>
        <label class="flex items-center gap-1.5">ถึง <input type="date" [formField]="data.rangeForm.to" /></label>
      </div>
    }
    <p class="text-xs text-muted">{{ span() }} · {{ data.draws().length | number }} งวด</p>
  `,
})
export class RangePicker {
  protected readonly data = inject(LotteryData);

  /** Sidebar is narrow (calendar link on its own line); in-page mobile copy puts it beside the presets. */
  readonly compact = input(false);

  protected readonly presets: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: '10y', label: '10 ปี' },
    { id: '5y', label: '5 ปี' },
    { id: '1y', label: '1 ปี' },
  ];
  protected readonly custom = computed(() => this.data.rangePreset() === 'custom');
  protected readonly span = computed(() => {
    const d = this.data.draws();
    return `${thaiDate(d[0]?.date)} – ${thaiDate(d.at(-1)?.date)}`;
  });
  protected readonly calBtn =
    'grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-[9px] border border-hair text-ink-2 hover:text-ink aria-pressed:bg-gold-soft aria-pressed:text-gold';
}
