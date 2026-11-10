import { nextDrawDate } from './next-draw';

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe('nextDrawDate', () => {
  it('is today on a draw day', () => {
    expect(ymd(nextDrawDate(new Date(2026, 10, 1)))).toEqual([2026, 11, 1]);
    expect(ymd(nextDrawDate(new Date(2026, 10, 16)))).toEqual([2026, 11, 16]);
  });

  it('is the 16th between the 2nd and the 15th', () => {
    expect(ymd(nextDrawDate(new Date(2026, 10, 9)))).toEqual([2026, 11, 16]);
  });

  it('rolls over to the 1st of next month, including December -> January', () => {
    expect(ymd(nextDrawDate(new Date(2026, 10, 20)))).toEqual([2026, 12, 1]);
    expect(ymd(nextDrawDate(new Date(2026, 11, 31)))).toEqual([2027, 1, 1]);
  });
});
