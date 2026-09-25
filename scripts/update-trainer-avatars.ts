import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = 'https://play.pokemonshowdown.com/sprites/trainers/';
const manifest = new URL(
  '../src/domain/player/data/trainer-avatars.json',
  import.meta.url,
);
const destination = new URL('../public/trainer-avatars/', import.meta.url);
const updating = process.argv[2] === '--update' && process.argv.length === 3;
if (process.argv.length > 2 && !updating)
  throw new Error('Use --update to refresh the trainer avatar manifest.');

type Avatar = { bottom: number; height: number; sha256: string };
const pinned = JSON.parse(await readFile(manifest, 'utf8')) as Record<
  string,
  Avatar
>;
let ids = Object.keys(pinned);
if (updating) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Trainer index: HTTP ${response.status}`);
  const index = await response.text();
  ids = Array.from(
    index.matchAll(
      /<figcaption><a href="([a-z0-9-]+)\.png">[^<]+<\/a>(?:<br \/>by ([^<]+))?<\/figcaption>/g,
    ),
    ([, id, artist]) => ({ id: id!, artist }),
  )
    .filter(({ artist }) => !artist)
    .map(({ id }) => id);
  if (ids.length < 100) throw new Error('Trainer index format changed');
}

const workRoot = fileURLToPath(new URL('../.wrangler/', import.meta.url));
await mkdir(workRoot, { recursive: true });
const work = await mkdtemp(join(workRoot, 'trainer-avatars-'));
const staged = join(work, 'assets');
const backup = join(work, 'previous');
await mkdir(staged);
const selected: Record<string, Avatar> = {};

try {
  const workers = Array.from({ length: 16 }, async () => {
    while (ids.length) {
      const id = ids.shift()!;
      if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid avatar ID: ${id}`);
      const response = await fetch(`${source}${id}.png`);
      if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(bytes)
        .metadata()
        .catch(() => null);
      if (
        metadata?.format !== 'png' ||
        metadata.width !== 80 ||
        metadata.height !== 80
      ) {
        if (updating) continue;
        throw new Error(`${id}: invalid trainer sprite`);
      }
      const normalized = await sharp(bytes).png().toBuffer();
      const { data, info } = await sharp(normalized)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let top = 0;
      for (let pixel = 0; pixel < info.width * info.height; pixel++) {
        if (data[pixel * info.channels + 3]) {
          top = Math.floor(pixel / info.width);
          break;
        }
      }
      let bottom = info.height;
      for (let pixel = info.width * info.height - 1; pixel >= 0; pixel--) {
        if (data[pixel * info.channels + 3]) {
          bottom = Math.floor(pixel / info.width) + 1;
          break;
        }
      }
      const avatar = {
        bottom: bottom / info.height,
        height: (bottom - top) / info.height,
        sha256: createHash('sha256').update(normalized).digest('hex'),
      };
      if (
        !updating &&
        (avatar.bottom !== pinned[id]?.bottom ||
          avatar.height !== pinned[id]?.height ||
          avatar.sha256 !== pinned[id]?.sha256)
      )
        throw new Error(`${id}: trainer sprite changed; update the manifest`);
      await writeFile(join(staged, `${id}.png`), normalized);
      selected[id] = avatar;
    }
  });
  const results = await Promise.allSettled(workers);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
  if (Object.keys(selected).length < 100)
    throw new Error('Too few uncredited 80 x 80 trainer sprites');

  const pendingManifest = join(work, 'trainer-avatars.json');
  if (updating) {
    const sorted = Object.fromEntries(
      Object.entries(selected).sort(([a], [b]) => a.localeCompare(b)),
    );
    await writeFile(pendingManifest, JSON.stringify(sorted, null, 2) + '\n');
  }
  let hadPrevious = false;
  try {
    await rename(destination, backup);
    hadPrevious = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  let installed = false;
  try {
    await rename(staged, destination);
    installed = true;
    if (updating) await rename(pendingManifest, manifest);
  } catch (error) {
    if (installed) await rm(destination, { recursive: true, force: true });
    if (hadPrevious) await rename(backup, destination);
    throw error;
  }
  console.log(
    `${updating ? 'Updated' : 'Prepared'} ${Object.keys(selected).length} trainer avatars.`,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}
