import { pick } from '../../lib/random';
import {
  getPixelPeekCropSize,
  getPixelPeekFocusPoints,
} from './pixel-peek-focus';
import type { PackedSpriteMeasurements } from './types';

export const getPixelPeekCrop = (
  measurements: PackedSpriteMeasurements | null,
  random: () => number,
  focusMask?: string,
): { focusX: number; focusY: number; zoom?: number } => {
  const focusPoints = measurements
    ? getPixelPeekFocusPoints(measurements, focusMask)
    : [];
  if (measurements && focusPoints.length > 0) {
    const [focusX, focusY] = pick(focusPoints, random)!;
    return {
      focusX,
      focusY,
      zoom: 1 / getPixelPeekCropSize(measurements[1], measurements[2]),
    };
  }
  const x = (pick([25, 50, 75], random) ?? 50) / 100;
  const y = (pick([25, 50, 75], random) ?? 50) / 100;
  if (!measurements) return { focusX: x * 100, focusY: y * 100 };

  const [, width, height, centerX, bottom] = measurements;
  const cropSize = getPixelPeekCropSize(width, height);
  return {
    focusX: (centerX + (x - 0.5) * Math.max(0, width - cropSize)) * 100,
    focusY:
      (bottom - height / 2 + (y - 0.5) * Math.max(0, height - cropSize)) * 100,
    zoom: 1 / cropSize,
  };
};
