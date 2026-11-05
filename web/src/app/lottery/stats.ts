/**
 * Digit x position statistics, shared by the heatmaps and the KPI row.
 * Pure functions (no Angular) so they are cheap to unit test.
 */

export interface CellStat {
  pos: number; // 0..5 = หลักที่ 1..6
  digit: number; // 0..9
  count: number;
  /** (observed - expected) / SD under a fair draw */
  z: number;
  /** 0..1 colour strength: squared so everyday noise (|z| < 1) stays close to gray */
  strength: number;
}

export interface PrizeStats {
  total: number;
  /** expected count per cell = total / 10 */
  expected: number;
  /** rows = digits 0..9, columns = positions 0..5 */
  cells: CellStat[][];
  /** cells with |z| >= 2 */
  beyond2: number;
}

export const Z_CLIP = 3;
/** P(|Z| >= 2) for a normal distribution: the share of cells expected beyond ±2σ by chance. */
export const BEYOND2_SHARE = 0.0455;
export const CELLS_PER_PRIZE = 60;

export function zStrength(z: number): number {
  return (Math.min(Math.abs(z), Z_CLIP) / Z_CLIP) ** 2;
}

export function digitPositionStats(numbers: readonly string[]): PrizeStats {
  // counts[pos][digit], one pass over every number
  const counts = Array.from({ length: 6 }, () => Array<number>(10).fill(0));
  for (const n of numbers) {
    for (let p = 0; p < 6; p++) counts[p][n.charCodeAt(p) - 48]++; // '0' is char code 48
  }
  const total = numbers.length;
  const expected = total / 10;
  // Binomial SD for one cell: sqrt(n * p * (1 - p)) with p = 0.1
  const sd = Math.sqrt(total * 0.1 * 0.9) || 1;

  let beyond2 = 0;
  const cells = Array.from({ length: 10 }, (_, digit) =>
    Array.from({ length: 6 }, (_, pos) => {
      const count = counts[pos][digit];
      const z = total ? (count - expected) / sd : 0;
      if (Math.abs(z) >= 2) beyond2++;
      return { pos, digit, count, z, strength: zStrength(z) };
    }),
  );
  return { total, expected, cells, beyond2 };
}
