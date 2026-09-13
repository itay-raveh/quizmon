import { formatMeasurement, measurementWinner } from './measurement-comparison';
import type { Difficulty } from './difficulty';

it.each([
  [1, 4],
  [2, 2],
  [3, 1.5],
  [4, 1.2],
  [5, 1.02],
  [5, 1.15],
] as [Difficulty, number][])(
  'accepts the inclusive Level %i boundary %f in either direction',
  (level, ratio) => {
    expect(
      measurementWinner([10, 20, 100, 100 * ratio], 'highest', level),
    ).toBe(3);
    expect(
      measurementWinner([100, 100 * ratio, 500, 600], 'lowest', level),
    ).toBe(0);
  },
);

it('compares the winner to the nearest competitor', () => {
  expect(measurementWinner([1, 2, 99, 100], 'highest', 1)).toBeUndefined();
  expect(measurementWinner([100, 101, 900, 1000], 'lowest', 1)).toBeUndefined();
  expect(measurementWinner([10, 20, 1000, 1019], 'highest', 5)).toBeUndefined();
  expect(measurementWinner([10, 20, 1000, 1151], 'highest', 5)).toBeUndefined();
});

it.each([
  [1, 2, 3, 3],
  [1, 1, 2, 100],
  [0, 1, 2, 100],
  [-1, 1, 2, 100],
  [NaN, 1, 2, 100],
  [Infinity, 1, 2, 100],
  [1, 2, 100],
])('rejects invalid measurement choices %j', (...values) => {
  expect(measurementWinner(values, 'highest', 1)).toBeUndefined();
  expect(measurementWinner(values, 'lowest', 1)).toBeUndefined();
});

it('reveals source units without rounding distinct values into a tie', () => {
  expect(formatMeasurement(9999, 'weight')).toBe('999.9 kg');
  expect(formatMeasurement(9500, 'weight')).toBe('950 kg');
  expect(formatMeasurement(1, 'height')).toBe('0.1 m');
  expect(formatMeasurement(2, 'height')).toBe('0.2 m');
});
