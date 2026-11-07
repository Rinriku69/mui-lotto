/**
 * Pure logic shared by search + generator. No Angular here, so it is easy to unit test.
 *
 * Key idea: there are only 1,000,000 possible tickets (000000-999999). That is small enough
 * to simply ENUMERATE every one in the browser (~100 ms). Enumeration gives us two things
 * exactly, with no probability formulas to get wrong:
 *   1. "how many tickets match this rule"  -> expected frequency under a fair draw
 *   2. "the list of matching tickets"       -> uniform random pick that satisfies the rule
 */

export const SPACE = 1_000_000;

export type SearchMode = 'anywhere' | 'prefix' | 'suffix' | 'position';

export interface Matcher {
  /** true if a 6-digit ticket matches */
  test: (n: string) => boolean;
  /** which of the 6 characters to highlight for a matching ticket */
  highlight: (n: string) => boolean[];
  /** stable key used for caching the enumeration */
  key: string;
}

const WILDCARD = /[xX?*_\-.]/g;

/** Turn a user's search into a matcher, or an error message the UI can show. */
export function buildMatcher(mode: SearchMode, raw: string): Matcher | string | null {
  const text = raw.trim();
  if (!text) return null;

  if (mode === 'position') {
    // Short input is padded with wildcards at the end: "61" means 61xxxx, which is exactly how the
    // slot boxes display it after switching from another mode.
    const p = text.replace(WILDCARD, '?').padEnd(6, '?');
    if (!/^[0-9?]{6}$/.test(p)) return 'โหมดตรงตำแหน่งรับได้ไม่เกิน 6 หลัก ใช้ x แทนหลักที่ไม่สนใจ เช่น x4xx99';
    if (!/[0-9]/.test(p)) return 'ต้องมีตัวเลขอย่างน้อย 1 หลัก';
    const fixed = [...p].map((c) => c !== '?');
    return {
      key: `position:${p}`,
      test: (n) => fixed.every((isFixed, i) => !isFixed || n[i] === p[i]),
      highlight: () => fixed,
    };
  }

  if (!/^[0-9]{1,6}$/.test(text)) return 'กรอกเฉพาะตัวเลข 1–6 หลัก';
  const k = text.length;

  // Highlights are computed from the actual number's length: the same matcher serves
  // 6-digit prizes and 2/3-digit special prizes.
  if (mode === 'prefix') {
    return { key: `prefix:${text}`, test: (n) => n.startsWith(text), highlight: (n) => mark(n.length, 0, k) };
  }
  if (mode === 'suffix') {
    return { key: `suffix:${text}`, test: (n) => n.endsWith(text), highlight: (n) => mark(n.length, n.length - k, k) };
  }
  // anywhere: highlight every place the run of digits occurs
  return {
    key: `anywhere:${text}`,
    test: (n) => n.includes(text),
    highlight: (n) => {
      const out = Array<boolean>(n.length).fill(false);
      for (let i = n.indexOf(text); i !== -1; i = n.indexOf(text, i + 1)) {
        for (let j = i; j < i + k; j++) out[j] = true;
      }
      return out;
    },
  };
}

function mark(size: number, start: number, len: number): boolean[] {
  return Array.from({ length: size }, (_, i) => i >= start && i < start + len);
}

export const pad6 = (i: number) => i.toString().padStart(6, '0');

// Map used as a cache (hash map): matcher key -> list of matching tickets.
// Re-typing the same query (or toggling a filter back) costs nothing the second time.
const enumerationCache = new Map<string, Int32Array>();

/**
 * Every number of `digits` length (000000..999999 by default) that passes `test`,
 * stored as integers to save memory. The 2- and 3-digit prizes use digits = 2 / 3,
 * so "chance a random number matches" is exact for them too.
 */
export function enumerate(key: string, test: (n: string) => boolean, digits = 6): Int32Array {
  const cacheKey = `${digits}|${key}`;
  const hit = enumerationCache.get(cacheKey);
  if (hit) return hit;
  const space = 10 ** digits;
  const buf = new Int32Array(space);
  let size = 0;
  for (let i = 0; i < space; i++) if (test(i.toString().padStart(digits, '0'))) buf[size++] = i;
  const result = buf.slice(0, size);
  if (enumerationCache.size > 50) enumerationCache.clear();
  enumerationCache.set(cacheKey, result);
  return result;
}

/** Share of all `digits`-length numbers that match (0..1). */
export function matchShare(m: Matcher, digits = 6): number {
  return enumerate(m.key, m.test, digits).length / 10 ** digits;
}

// ---------------- generator ----------------

export type CountOp = 'atLeast' | 'exactly' | 'atMost';

export interface DigitRule {
  digit: string; // '0'..'9'
  op: CountOp;
  count: number;
}

export interface GeneratorSpec {
  /** 6 chars, digits or wildcards; empty = no positional constraint */
  pattern: string;
  /** a run of digits that must appear somewhere, e.g. "99" */
  contains: string;
  rules: DigitRule[];
}

/** Build one test function out of every constraint, or return an error message. */
export function compileSpec(spec: GeneratorSpec): Matcher | string {
  const tests: ((n: string) => boolean)[] = [];
  const keyParts: string[] = [];

  const pattern = spec.pattern.trim();
  if (pattern) {
    const m = buildMatcher('position', pattern);
    if (typeof m === 'string') return m;
    if (m) {
      tests.push(m.test);
      keyParts.push(m.key);
    }
  }

  const contains = spec.contains.trim();
  if (contains) {
    if (!/^[0-9]{1,6}$/.test(contains)) return '"ต้องมีชุดเลข" กรอกได้เฉพาะตัวเลข 1–6 หลัก';
    tests.push((n) => n.includes(contains));
    keyParts.push(`has:${contains}`);
  }

  for (const r of spec.rules) {
    const c = Number(r.count);
    if (!Number.isInteger(c) || c < 0 || c > 6) return 'จำนวนครั้งต้องเป็น 0–6';
    tests.push((n) => {
      // count how many times the digit appears in the ticket
      let k = 0;
      for (const ch of n) if (ch === r.digit) k++;
      return r.op === 'atLeast' ? k >= c : r.op === 'atMost' ? k <= c : k === c;
    });
    keyParts.push(`${r.digit}${r.op}${c}`);
  }

  return {
    key: `gen:${keyParts.join('|')}`,
    // `every` = "AND" of all the constraint functions (closures captured above)
    test: (n) => tests.every((t) => t(n)),
    highlight: () => Array<boolean>(6).fill(false),
  };
}

/** Pick `k` distinct tickets uniformly at random from the matching set. */
export function pickRandom(matches: Int32Array, k: number): string[] {
  const n = matches.length;
  const want = Math.min(k, n);
  const chosen = new Set<number>(); // Set guarantees no duplicates
  const rnd = new Uint32Array(1);
  while (chosen.size < want) {
    crypto.getRandomValues(rnd); // cryptographic RNG: no predictable Math.random patterns
    chosen.add(rnd[0] % n); // modulo bias is < n / 2^32: negligible here
  }
  return [...chosen].map((i) => pad6(matches[i]));
}
