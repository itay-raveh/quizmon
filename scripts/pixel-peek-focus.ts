import type { SpriteMeasurements } from '../src/game/types.ts';

import {
  getPixelPeekCropSize,
  getPixelPeekFocusPoints,
  pixelPeekFocusGridSize,
} from '../src/game/pixel-peek-focus.ts';

export const findPixelPeekFocus = (
  painted: readonly number[],
  canvasWidth: number,
  canvasHeight: number,
  size: SpriteMeasurements,
): string => {
  const stride = canvasWidth + 1;
  const summed = new Uint32Array(stride * (canvasHeight + 1));
  for (const pixel of painted) {
    summed[
      (Math.floor(pixel / canvasWidth) + 1) * stride + (pixel % canvasWidth) + 1
    ] = 1;
  }
  for (let y = 1; y <= canvasHeight; y++) {
    for (let x = 1; x <= canvasWidth; x++) {
      const index = y * stride + x;
      summed[index] =
        summed[index]! +
        summed[index - 1]! +
        summed[index - stride]! -
        summed[index - stride - 1]!;
    }
  }

  const cropSize = getPixelPeekCropSize(size.width, size.height);
  const halfWidth = (cropSize * canvasWidth) / 2;
  const halfHeight = (cropSize * canvasHeight) / 2;
  const mask = new Uint8Array(Math.ceil(pixelPeekFocusGridSize ** 2 / 4));
  const candidates = getPixelPeekFocusPoints(
    [size.area, size.width, size.height, size.centerX, size.bottom],
    'f'.repeat(mask.length),
  );
  const opaque = new Set(painted);
  for (const [index, [focusX, focusY]] of candidates.entries()) {
    const x = (focusX / 100) * canvasWidth;
    const y = (focusY / 100) * canvasHeight;
    if (!opaque.has(Math.floor(y) * canvasWidth + Math.floor(x))) continue;
    const x0 = Math.max(0, Math.ceil(x - halfWidth - 0.5));
    const y0 = Math.max(0, Math.ceil(y - halfHeight - 0.5));
    const x1 = Math.min(canvasWidth, Math.ceil(x + halfWidth - 0.5));
    const y1 = Math.min(canvasHeight, Math.ceil(y + halfHeight - 0.5));
    const count =
      summed[y1 * stride + x1]! -
      summed[y0 * stride + x1]! -
      summed[y1 * stride + x0]! +
      summed[y0 * stride + x0]!;
    if (count < Math.max(1, cropSize ** 2 * canvasWidth * canvasHeight * 0.15))
      continue;

    const digit = Math.floor(index / 4);
    mask[digit] = mask[digit]! | (1 << (index % 4));
  }
  return [...mask].map((value) => value.toString(16)).join('');
};
