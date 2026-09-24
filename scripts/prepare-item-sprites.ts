import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pinned from '../src/assets/items/manifest.json' with { type: 'json' };

const directory = new URL('../public/item-sprites/', import.meta.url);
const digest = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

await mkdir(directory, { recursive: true });
await Promise.all(
  Object.entries(pinned).map(async ([name, expected]) => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid item: ${name}`);
    const target = new URL(`${name}.png`, directory);
    const existing = await readFile(target).catch(() => null);
    if (existing && digest(existing) === expected) return;

    const source = `https://www.serebii.net/itemdex/sprites/${name.replaceAll('-', '')}.png`;
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.format !== 'png' ||
      metadata.width !== 40 ||
      metadata.height !== 40 ||
      digest(bytes) !== expected
    )
      throw new Error(`${name}: sprite differs from the pinned PNG`);
    await writeFile(target, bytes);
  }),
);
console.log(`Prepared ${Object.keys(pinned).length} item sprites.`);
