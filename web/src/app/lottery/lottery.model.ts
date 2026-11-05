export type SpecialKind = 'front3' | 'last3' | 'last2';

export interface Draw {
  date: string; // ISO yyyy-mm-dd
  /** prizes[0] = รางวัลที่ 1 ... prizes[4] = รางวัลที่ 5 */
  prizes: string[][];
  /** front3 is [] before Sep 2015 (back then last3 had four numbers) */
  special: Record<SpecialKind, string[]>;
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

export interface SpecialEntry {
  date: string;
  kind: SpecialKind;
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

export const SPECIAL_KINDS: readonly SpecialKind[] = ['front3', 'last3', 'last2'];
export const SPECIAL_LABEL: Record<SpecialKind, string> = {
  front3: 'เลขหน้า 3 ตัว',
  last3: 'เลขท้าย 3 ตัว',
  last2: 'เลขท้าย 2 ตัว',
};
export const SPECIAL_DIGITS: Record<SpecialKind, number> = { front3: 3, last3: 3, last2: 2 };
