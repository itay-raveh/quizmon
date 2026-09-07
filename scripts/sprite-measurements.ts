import type { SpriteMeasurements } from '../src/game/types.ts';

const loadSprite = async (path: string) => {
  if (!/^\/sprites\/pokemon\/\d+\.png$/.test(path)) {
    throw new Error(`Unexpected portrait sprite path: ${path}`);
  }
  const response = await fetch(
    `https://raw.githubusercontent.com/PokeAPI/sprites/master${path}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) throw new Error(`Sprite ${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer()).toString('base64');
};

export const measureCatalogSprites = async (
  paths: readonly string[],
  load: (path: string) => Promise<string> = loadSprite,
): Promise<Map<string, SpriteMeasurements>> => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const measurements = new Map<string, SpriteMeasurements>();
    const unique = [...new Set(paths)];
    for (let offset = 0; offset < unique.length; offset += 4) {
      const batch = await Promise.all(
        unique.slice(offset, offset + 4).map(async (path) => ({
          path,
          data: await load(path),
        })),
      );
      const measured = await page.evaluate(async (sprites) => {
        return Promise.all(
          sprites.map(async ({ path, data }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${data}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d');
            if (!context)
              throw new Error('Canvas is unavailable for sprite measurement');
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            ).data;
            let left = canvas.width;
            let right = -1;
            let top = canvas.height;
            let bottom = -1;
            let paintedPixels = 0;
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                if (pixels[(y * canvas.width + x) * 4 + 3]! < 128) continue;
                paintedPixels++;
                left = Math.min(left, x);
                right = Math.max(right, x);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
              }
            }
            if (!paintedPixels)
              throw new Error(`Sprite ${path} has no visible pixels`);
            const round = (value: number) =>
              Math.round(value * 1_000_000) / 1_000_000;
            return [
              path,
              {
                area: round(paintedPixels / (canvas.width * canvas.height)),
                width: round((right - left + 1) / canvas.width),
                height: round((bottom - top + 1) / canvas.height),
                centerX: round((left + right + 1) / (2 * canvas.width)),
                bottom: round((bottom + 1) / canvas.height),
              },
            ] as const;
          }),
        );
      }, batch);
      for (const [path, size] of measured) measurements.set(path, size);
    }
    return measurements;
  } finally {
    await browser.close();
  }
};
