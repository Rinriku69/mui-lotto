import { Matcher, buildMatcher, compileSpec, enumerate, pickRandom } from './number-pattern';

const ok = (m: Matcher | string | null) => {
  if (!m || typeof m === 'string') throw new Error(`expected matcher, got ${m}`);
  return m;
};

describe('buildMatcher', () => {
  it('suffix / prefix / anywhere', () => {
    expect(ok(buildMatcher('suffix', '59')).test('123459')).toBe(true);
    expect(ok(buildMatcher('suffix', '59')).test('591234')).toBe(false);
    expect(ok(buildMatcher('prefix', '59')).test('591234')).toBe(true);
    expect(ok(buildMatcher('anywhere', '59')).test('125934')).toBe(true);
  });

  it('position mode accepts x wildcards and highlights fixed digits', () => {
    const m = ok(buildMatcher('position', 'x4xx99'));
    expect(m.test('041299')).toBe(true);
    expect(m.test('051299')).toBe(false);
    expect(m.highlight('041299')).toEqual([false, true, false, false, true, true]);
  });

  it('position mode pads short input with trailing wildcards', () => {
    const m = ok(buildMatcher('position', '12'));
    expect(m.key).toBe('position:12????');
    expect(m.test('123456')).toBe(true);
    expect(m.test('213456')).toBe(false);
  });

  it('rejects bad input with a message', () => {
    expect(typeof buildMatcher('position', '1234567')).toBe('string');
    expect(typeof buildMatcher('position', '12a')).toBe('string');
    expect(typeof buildMatcher('suffix', '1a')).toBe('string');
    expect(buildMatcher('suffix', '  ')).toBeNull();
  });

  it('anywhere highlights every occurrence', () => {
    expect(ok(buildMatcher('anywhere', '9')).highlight('919090')).toEqual([true, false, true, false, true, false]);
  });

  it('highlights by the actual length of shorter (2/3-digit) numbers', () => {
    expect(ok(buildMatcher('suffix', '61')).highlight('261')).toEqual([false, true, true]);
    expect(ok(buildMatcher('suffix', '61')).highlight('61')).toEqual([true, true]);
    expect(ok(buildMatcher('prefix', '5')).highlight('512')).toEqual([true, false, false]);
  });
});

describe('enumerate over shorter spaces', () => {
  it('a 2-digit suffix is 1 of 100 two-digit numbers and 10 of 1,000 three-digit numbers', () => {
    const m = ok(buildMatcher('suffix', '61'));
    expect(enumerate(m.key, m.test, 2).length).toBe(1);
    expect(enumerate(m.key, m.test, 3).length).toBe(10);
  });
});

describe('enumerate (exact counts over all 1,000,000 tickets)', () => {
  it('a 2-digit suffix matches exactly 10,000 tickets', () => {
    const m = ok(buildMatcher('suffix', '59'));
    expect(enumerate(m.key, m.test).length).toBe(10_000);
  });

  it('"at least two 4s" matches the binomial count', () => {
    // P(k>=2) = 1 - P(0) - P(1) = 1 - 0.9^6 - 6*0.1*0.9^5
    const expected = Math.round(1_000_000 * (1 - 0.9 ** 6 - 6 * 0.1 * 0.9 ** 5));
    const m = ok(compileSpec({ pattern: '', contains: '', rules: [{ digit: '4', op: 'atLeast', count: 2 }] }));
    expect(enumerate(m.key, m.test).length).toBe(expected);
  });

  it('picked numbers always satisfy the rules and are distinct', () => {
    const m = ok(compileSpec({ pattern: 'xxxx9x', contains: '', rules: [{ digit: '4', op: 'exactly', count: 2 }] }));
    const picks = pickRandom(enumerate(m.key, m.test), 20);
    expect(new Set(picks).size).toBe(20);
    for (const p of picks) {
      expect(p[4]).toBe('9');
      expect([...p].filter((c) => c === '4').length).toBe(2);
    }
  });
});
