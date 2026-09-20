import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { isRecord } from '../src/lib/validation.ts';

const artifactPaths = [
  'assets',
  'worker',
  'server',
  'deploy',
  'src',
  'package.json',
  'package-lock.json',
];

async function filesAt(root: string, path: string): Promise<string[]> {
  const entries = await readdir(join(root, path), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path + '/' + entry.name;
    if (entry.isDirectory()) files.push(...(await filesAt(root, child)));
    else if (entry.isFile()) files.push(child);
    else throw new Error('Release payload must contain regular files only.');
  }
  return files;
}

async function contentHashes(root: string) {
  const hashes: Record<string, string> = {};
  for (const path of artifactPaths) {
    const files = path.endsWith('.json') ? [path] : await filesAt(root, path);
    for (const file of files)
      hashes[file] = createHash('sha256')
        .update(await readFile(join(root, file)))
        .digest('hex');
  }
  return hashes;
}

function migrationIdentities(root: string) {
  return readMigrationFiles({
    migrationsFolder: join(root, 'server/migrations'),
  }).map(({ hash, folderMillis }) => ({ hash, timestamp: folderMillis }));
}

export async function sealArtifact(
  root: string,
  source: { revision: string; dirty: boolean },
) {
  if (!/^[a-f0-9]{40}$/.test(source.revision))
    throw new Error('A full source revision is required.');
  const manifest = {
    version: 1,
    source,
    migrations: migrationIdentities(root),
    files: await contentHashes(root),
  };
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return manifest;
}

export async function verifyArtifact(root: string) {
  const manifest: unknown = JSON.parse(
    await readFile(join(root, 'manifest.json'), 'utf8'),
  );
  if (
    !isRecord(manifest) ||
    manifest.version !== 1 ||
    !isRecord(manifest.files)
  )
    throw new Error('Unsupported release manifest.');
  const actual = await contentHashes(root);
  const expected = manifest.files;
  if (
    Object.keys(actual).length !== Object.keys(expected).length ||
    Object.entries(actual).some(([path, hash]) => expected[path] !== hash)
  )
    throw new Error('Release payload checksum mismatch.');
  if (
    JSON.stringify(manifest.migrations) !==
    JSON.stringify(migrationIdentities(root))
  )
    throw new Error('Release migration identities do not match the payload.');
  return manifest;
}
