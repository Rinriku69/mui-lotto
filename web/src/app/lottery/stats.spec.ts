import { digitPositionStats, twoDigitStats, zStrength } from './stats';

describe('digitPositionStats', () => {
  it('counts each digit in each position', () => {
    const s = digitPositionStats(['123456', '123450', '923456']);
    expect(s.total).toBe(3);
    expect(s.cells[1][0].count).toBe(2); // digit 1 in position 1
    expect(s.cells[9][0].count).toBe(1);
    expect(s.cells[0][5].count).toBe(1); // digit 0 in position 6
  });

  it('supports 3-digit numbers', () => {
    const s = digitPositionStats(['300', '950'], 3);
    expect(s.cells[0].length).toBe(3);
    expect(s.cells[0][1].count).toBe(1); // '0' in position 2 of 300
    expect(s.cells[0][2].count).toBe(2);
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

describe('twoDigitStats', () => {
  it('maps tens to rows and units to columns, expecting n/100 per cell', () => {
    const s = twoDigitStats(['61', '61', '07']);
    expect(s.cells[6][1].count).toBe(2);
    expect(s.cells[0][7].count).toBe(1);
    expect(s.expected).toBeCloseTo(0.03);
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
