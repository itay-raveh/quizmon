import { mkdir, rm, writeFile } from 'node:fs/promises';

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
const queue = [...ids];
const selected: string[] = [];
await Promise.all(
  Array.from({ length: 16 }, async () => {
    while (queue.length) {
      const id = queue.shift()!;
      const image = await fetch(`${source}${id}.png`);
      if (!image.ok) throw new Error(`${id}: HTTP ${image.status}`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      if (bytes.length < 24) continue;
      const header = new DataView(bytes.buffer);
      if (
        header.getUint32(0) !== 0x89504e47 ||
        header.getUint32(16) !== 80 ||
        header.getUint32(20) !== 80
      )
        continue;
      await writeFile(new URL(`${id}.png`, destination), bytes);
      selected.push(id);
    }
  }),
);
if (selected.length < 100)
  throw new Error('Too few uncredited 80 x 80 trainer sprites');
selected.sort();
await mkdir(new URL('../src/domain/player/data/', import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL('../src/domain/player/data/trainer-avatars.json', import.meta.url),
  JSON.stringify(selected, null, 2) + '\n',
);
console.log(`Updated ${selected.length} trainer avatars.`);
