import { digitPositionStats, zStrength } from './stats';

describe('digitPositionStats', () => {
  it('counts each digit in each position', () => {
    const s = digitPositionStats(['123456', '123450', '923456']);
    expect(s.total).toBe(3);
    expect(s.cells[1][0].count).toBe(2); // digit 1 in position 1
    expect(s.cells[9][0].count).toBe(1);
    expect(s.cells[0][5].count).toBe(1); // digit 0 in position 6
  });

  it('a perfectly uniform set has z = 0 everywhere and nothing beyond 2σ', () => {
    const uniform = Array.from({ length: 10 }, (_, d) => String(d).repeat(6));
    const s = digitPositionStats(uniform);
    expect(s.cells.flat().every((c) => c.z === 0)).toBe(true);
    expect(s.beyond2).toBe(0);
  });

  it('handles an empty range without NaN', () => {
    const s = digitPositionStats([]);
    expect(s.cells.flat().every((c) => c.z === 0 && c.strength === 0)).toBe(true);
  });
});

describe('zStrength', () => {
  it('is squared and clipped at 3σ', () => {
    expect(zStrength(0)).toBe(0);
    expect(zStrength(1.5)).toBeCloseTo(0.25);
    expect(zStrength(-3)).toBe(1);
    expect(zStrength(10)).toBe(1);
  });
});
