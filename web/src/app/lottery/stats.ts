/**
 * Frequency statistics shared by heatmaps and KPI tiles.
 * Pure functions (no Angular) so they are cheap to unit test.
 *
 * Every test here has the same shape: a cell counts how often something happened, a fair
 * draw expects n * p, and z = (observed - expected) / sqrt(n * p * (1 - p)) says how far off it is.
 */

export interface CellStat {
  /** column: position 0..(digits-1) in digit grids, units digit in the 00–99 grid */
  pos: number;
  /** row: digit 0..9 in digit grids, tens digit in the 00–99 grid */
  digit: number;
  count: number;
  z: number;
  /** 0..1 colour strength: squared so everyday noise (|z| < 1) stays close to gray */
  strength: number;
}

export interface GridStats {
  total: number;
  /** expected count per cell */
  expected: number;
  /** binomial SD per cell */
  sd: number;
  /** rows x columns */
  cells: CellStat[][];
  /** cells with |z| >= 2 */
  beyond2: number;
}

/** Kept for the 6-digit prize grids, where it reads more naturally. */
export type PrizeStats = GridStats;

export const Z_CLIP = 3;
/** P(|Z| >= 2) for a normal distribution: the share of cells expected beyond ±2σ by chance. */
export const BEYOND2_SHARE = 0.0455003; // 2 * (1 - Φ(2)); the extra digits keep 100 * p from rounding to 4.5
export const CELLS_PER_PRIZE = 60;

export function zStrength(z: number): number {
  return (Math.min(Math.abs(z), Z_CLIP) / Z_CLIP) ** 2;
}

function grid(total: number, p: number, counts: number[][]): GridStats {
  const expected = total * p;
  const sd = Math.sqrt(total * p * (1 - p)) || 1;
  let beyond2 = 0;
  const cells = counts.map((row, digit) =>
    row.map((count, pos) => {
      const z = total ? (count - expected) / sd : 0;
      if (Math.abs(z) >= 2) beyond2++;
      return { pos, digit, count, z, strength: zStrength(z) };
    }),
  );
  return { total, expected, sd, cells, beyond2 };
}

/**
 * Digit x position grid: rows = digit 0..9, columns = position.
 * Works for any fixed length (6-digit prizes, 3-digit front/last).
 */
export function digitPositionStats(numbers: readonly string[], digits = 6): GridStats {
  const counts = Array.from({ length: 10 }, () => Array<number>(digits).fill(0));
  for (const n of numbers) {
    for (let p = 0; p < digits; p++) counts[n.charCodeAt(p) - 48][p]++; // '0' is char code 48
  }
  return grid(numbers.length, 0.1, counts);
}

/** 00–99 grid for two-digit numbers: rows = tens, columns = units, each cell p = 1/100. */
export function twoDigitStats(numbers: readonly string[]): GridStats {
  const counts = Array.from({ length: 10 }, () => Array<number>(10).fill(0));
  for (const n of numbers) counts[n.charCodeAt(0) - 48][n.charCodeAt(1) - 48]++;
  return grid(numbers.length, 0.01, counts);
}
