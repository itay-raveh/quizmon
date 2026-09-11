// @vitest-environment node
import { findPixelPeekFocus } from '../../../scripts/pixel-peek-focus';
import { getPixelPeekFocusPoints } from './pixel-peek-focus';
import type { SpriteMeasurements } from './types';

const width = 60;
const height = 60;
const size: SpriteMeasurements = {
  area: 0,
  width: 1,
  height: 1,
  centerX: 0.5,
  bottom: 1,
};

it('includes extremities while excluding empty space and isolated pixels', () => {
  const painted: number[] = [];
  for (let y = 5; y < 55; y++) {
    for (let x = 5; x < 55; x++) {
      if ((x < 23 && y > 15) || (x > 40 && y < 35)) painted.push(y * width + x);
    }
  }
  painted.push(58 * width + 58);
  const mask = findPixelPeekFocus(painted, width, height, size);
  const points = getPixelPeekFocusPoints([0, 1, 1, 0.5, 1], mask);
  expect(points.length).toBeGreaterThan(9);
  expect(points.length).toBeLessThanOrEqual(81);
  expect(points.some(([x, y]) => x > 75 && y < 20)).toBe(true);
  expect(points.some(([x, y]) => x < 20 && y > 75)).toBe(true);
  expect(points.some(([x, y]) => x > 95 && y > 95)).toBe(false);
  for (const [focusX, focusY] of points) {
    const x = Math.floor((focusX / 100) * width);
    const y = Math.floor((focusY / 100) * height);
    expect(painted).toContain(y * width + x);
    const visible = painted.filter((pixel) => {
      const px = (pixel % width) + 0.5;
      const py = Math.floor(pixel / width) + 0.5;
      return (
        Math.abs(px - (focusX / 100) * width) < 60 / 3.5 / 2 &&
        Math.abs(py - (focusY / 100) * height) < 60 / 3.5 / 2
      );
    }).length;
    expect(visible).toBeGreaterThanOrEqual((60 / 3.5) ** 2 * 0.15);
  }
  expect(findPixelPeekFocus(painted, width, height, size)).toEqual(mask);
});

it('does not manufacture a focus point for an empty sprite', () => {
  expect(findPixelPeekFocus([], width, height, size)).toBe('0'.repeat(21));
});
