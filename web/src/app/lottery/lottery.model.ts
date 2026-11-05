export interface Draw {
  date: string; // ISO yyyy-mm-dd
  /** prizes[0] = รางวัลที่ 1 ... prizes[4] = รางวัลที่ 5 */
  prizes: string[][];
}

export interface DrawsFile {
  generated: string;
  draws: Draw[];
}

/** One winning number, flattened out of its draw. */
export interface WinEntry {
  date: string;
  prize: number; // 1..5
  number: string;
}

export const PRIZES = [1, 2, 3, 4, 5] as const;
export const PRIZE_LABEL: Record<number, string> = {
  1: 'รางวัลที่ 1',
  2: 'รางวัลที่ 2',
  3: 'รางวัลที่ 3',
  4: 'รางวัลที่ 4',
  5: 'รางวัลที่ 5',
};
/** How many numbers each prize draws per งวด. */
export const PRIZE_SIZE: Record<number, number> = { 1: 1, 2: 5, 3: 10, 4: 50, 5: 100 };
