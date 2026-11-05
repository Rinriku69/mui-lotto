// Intl's th-TH locale uses the Buddhist calendar by default: 2026-11-01 -> "1 พ.ย. 2569".
const FORMAT = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

/** ISO yyyy-mm-dd -> short Thai date ("–" when missing). */
export function thaiDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return FORMAT.format(new Date(y, m - 1, d));
}
