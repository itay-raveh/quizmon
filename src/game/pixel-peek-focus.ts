import type { PackedSpriteMeasurements, PixelPeekFocus } from './types.ts';

export const pixelPeekFocusGridSize = 9;

export const getPixelPeekCropSize = (width: number, height: number): number =>
  Math.max(width, height) ** 0.8 / 3.5;

export const getPixelPeekFocusPoints = (
  measurements: PackedSpriteMeasurements,
  mask: string = '',
): PixelPeekFocus[] => {
  const [, width, height, centerX, bottom] = measurements;
  const points: PixelPeekFocus[] = [];
  for (let index = 0; index < pixelPeekFocusGridSize ** 2; index++) {
    if (
      !(parseInt(mask[Math.floor(index / 4)] ?? '0', 16) & (1 << (index % 4)))
    )
      continue;
    const x = ((index % pixelPeekFocusGridSize) + 0.5) / pixelPeekFocusGridSize;
    const y =
      (Math.floor(index / pixelPeekFocusGridSize) + 0.5) /
      pixelPeekFocusGridSize;
    points.push([
      (centerX + (x - 0.5) * width) * 100,
      (bottom - (1 - y) * height) * 100,
    ]);
  }
  return points;
};
