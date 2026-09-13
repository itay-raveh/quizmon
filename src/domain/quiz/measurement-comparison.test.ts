import { formatMeasurement, measurementWinner } from './measurement-comparison';
import type { MeasurementRules } from './measurement-comparison';

const rules: MeasurementRules = {
  minimumRatio: 1.1,
  maximumRatio: 1.3,
  maximumSpread: 1.5,
};

it('uses supplied comparison rules rather than a fixed difficulty table', () => {
  expect(measurementWinner([100, 110, 120, 150], 'highest', rules)).toBe(3);
  expect(measurementWinner([100, 110, 120, 150], 'lowest', rules)).toBe(0);
  expect(
    measurementWinner([100, 110, 120, 150], 'highest', {
      ...rules,
      maximumSpread: 1.4,
    }),
  ).toBeUndefined();
  expect(
    measurementWinner([100, 110, 120, 150], 'highest', {
      ...rules,
      minimumRatio: 1.3,
    }),
  ).toBeUndefined();
  expect(
    measurementWinner([100, 110, 120, 150], 'highest', {
      ...rules,
      maximumRatio: 1.2,
    }),
  ).toBeUndefined();
});

it('rejects a tight pair with two obvious alternatives under a cluster limit', () => {
  expect(measurementWinner([1, 2, 100, 120], 'highest', rules)).toBeUndefined();
  expect(
    measurementWinner([100, 120, 900, 1000], 'lowest', rules),
  ).toBeUndefined();
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
  expect(measurementWinner(values, 'highest', rules)).toBeUndefined();
  expect(measurementWinner(values, 'lowest', rules)).toBeUndefined();
});

it('reveals source units without rounding distinct values into a tie', () => {
  expect(formatMeasurement(9999, 'weight')).toBe('999.9 kg');
  expect(formatMeasurement(9500, 'weight')).toBe('950 kg');
  expect(formatMeasurement(1, 'height')).toBe('0.1 m');
  expect(formatMeasurement(2, 'height')).toBe('0.2 m');
});
