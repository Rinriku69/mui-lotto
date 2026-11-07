import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LotteryData } from '../lottery/lottery-data';
import { NumberGenerator } from './number-generator';

describe('NumberGenerator.roll', () => {
  // The component class is constructed directly (no template): inject() and form() only need an
  // injection context, and LotteryData is stubbed so no HTTP is involved.
  const create = () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LotteryData, useValue: { entries: signal([]) } }],
    });
    return TestBed.runInInjectionContext(() => new NumberGenerator());
  };

  it('flushes a still-debounced contains value before drawing', () => {
    const gen = create();
    gen.model.update((m) => ({ ...m, rules: [] }));

    // What the [formField] directive does on each keystroke: write the raw control value.
    gen.genForm.contains().controlValue.set('123');
    expect(gen.model().contains).toBe(''); // still inside the 300 ms debounce window

    gen.roll();

    expect(gen.model().contains).toBe('123');
    expect(gen.picked().length).toBe(5);
    for (const p of gen.picked()) expect(p.number).toContain('123');
  });
});
