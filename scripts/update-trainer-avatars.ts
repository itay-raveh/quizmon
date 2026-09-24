import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'https://play.pokemonshowdown.com/sprites/trainers/';
const response = await fetch(source);
if (!response.ok) throw new Error(`Trainer index: HTTP ${response.status}`);
const index = await response.text();
const ids = Array.from(
  index.matchAll(
    /<figcaption><a href="([a-z0-9-]+)\.png">[^<]+<\/a>(?:<br \/>by ([^<]+))?<\/figcaption>/g,
  ),
  ([, id, artist]) => ({ id, artist }),
)
  .filter(({ artist }) => !artist)
  .map(({ id }) => id);
if (ids.length < 100) throw new Error('Trainer index format changed');

const destination = new URL('../public/trainer-avatars/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const selected: { id: string; bottom: number }[] = [];
await Promise.all(
  Array.from({ length: 16 }, async () => {
    while (ids.length) {
      const id = ids.shift()!;
      const image = await fetch(`${source}${id}.png`);
      if (!image.ok) throw new Error(`${id}: HTTP ${image.status}`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      const metadata = await sharp(bytes)
        .metadata()
        .catch(() => null);
      if (
        metadata?.format !== 'png' ||
        metadata.width !== 80 ||
        metadata.height !== 80
      )
        continue;
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let bottom = 1;
      for (let pixel = info.width * info.height - 1; pixel >= 0; pixel--) {
        if (data[pixel * info.channels + 3]) {
          bottom = (Math.floor(pixel / info.width) + 1) / info.height;
          break;
        }
      }
      await writeFile(new URL(`${id}.png`, destination), bytes);
      selected.push({ id, bottom });
    }
  }),
);
if (selected.length < 100)
  throw new Error('Too few uncredited 80 x 80 trainer sprites');
selected.sort((a, b) => a.id.localeCompare(b.id));
await mkdir(new URL('../src/domain/player/data/', import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL('../src/domain/player/data/trainer-avatars.json', import.meta.url),
  JSON.stringify(
    Object.fromEntries(selected.map(({ id, bottom }) => [id, bottom])),
    null,
    2,
  ) + '\n',
);
console.log(`Updated ${selected.length} trainer avatars.`);
