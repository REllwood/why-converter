import { createProgressReporter } from '../../src/core/progress';

describe('createProgressReporter', () => {
  it('returns undefined when there is no callback', () => {
    expect(createProgressReporter(undefined)).toBeUndefined();
  });

  it('drops values that would move progress backwards or repeat', () => {
    const seen: number[] = [];
    const report = createProgressReporter(value => seen.push(value))!;

    [0, 25, 50, 50, 100, 60, 100].forEach(report);

    expect(seen).toEqual([0, 25, 50, 100]);
  });

  it('clamps values into the 0-100 range', () => {
    const seen: number[] = [];
    const report = createProgressReporter(value => seen.push(value))!;

    [-10, 150].forEach(report);

    expect(seen).toEqual([0, 100]);
  });
});
