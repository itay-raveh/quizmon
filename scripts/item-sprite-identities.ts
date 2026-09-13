import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { fetchSpriteSource } from '../src/domain/pokemon/sprite-source.ts';
import type { TopicCatalog } from '../src/domain/quiz/topic-catalog.ts';

export const addItemSpriteIdentities = async (
  topics: TopicCatalog,
  load: (path: string) => Promise<Response> = fetchSpriteSource,
): Promise<void> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const items = topics.items.filter((item) => item.sprite);
    for (let offset = 0; offset < items.length; offset += 4) {
      const batch = await Promise.all(
        items.slice(offset, offset + 4).map(async (item) => {
          const response = await load(item.sprite!);
          if (!response.ok) {
            topics.gaps.itemSprite!.push(item.name);
            item.sprite = null;
            return null;
          }
          return {
            name: item.name,
            data: Buffer.from(await response.arrayBuffer()).toString('base64'),
          };
        }),
      );
      const pixels = await page.evaluate(
        async (batch) =>
          Promise.all(
            batch
              .filter((entry) => !!entry)
              .map(async (entry) => {
                const image = new Image();
                image.src = `data:image/png;base64,${entry.data}`;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d')!;
                context.drawImage(image, 0, 0);
                const values = context.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                ).data;
                let left = canvas.width,
                  right = -1,
                  top = canvas.height,
                  bottom = -1;
                for (let y = 0; y < canvas.height; y++)
                  for (let x = 0; x < canvas.width; x++)
                    if (values[(y * canvas.width + x) * 4 + 3]) {
                      left = Math.min(left, x);
                      right = Math.max(right, x);
                      top = Math.min(top, y);
                      bottom = Math.max(bottom, y);
                    }
                if (right < 0) return { name: entry.name, pixels: '' };
                const normalized: number[] = [
                  right - left + 1,
                  bottom - top + 1,
                ];
                for (let y = top; y <= bottom; y++)
                  for (let x = left; x <= right; x++) {
                    const index = (y * canvas.width + x) * 4;
                    normalized.push(
                      ...(values[index + 3]
                        ? Array.from(values.slice(index, index + 4))
                        : [0, 0, 0, 0]),
                    );
                  }
                return { name: entry.name, pixels: normalized.join(',') };
              }),
          ),
        batch,
      );
      for (const result of pixels) {
        const item = topics.items.find((item) => item.name === result.name)!;
        if (result.pixels)
          item.spriteIdentity = createHash('sha256')
            .update(result.pixels)
            .digest('hex');
        else {
          item.sprite = null;
          topics.gaps.itemSprite!.push(item.name);
        }
      }
    }
  } finally {
    await browser.close();
  }
};
