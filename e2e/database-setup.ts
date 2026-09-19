import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

export default async function setupDatabaseFixture() {
  const outputDirectory = process.env.QUIZMON_E2E_DIST_DIR ?? 'dist';
  const assets = await readdir(join(outputDirectory, 'assets/build'));
  const worker = `/assets/build/${assets.find((name) => /^worker-.*\.js$/.test(name))!}`;
  const html = await readFile(join(outputDirectory, 'index.html'), 'utf8');
  const entry = html.match(/src="(\/assets\/build\/[^"]+\.js)"/)![1]!;
  const output = await build({
    configFile: false,
    logLevel: 'error',
    publicDir: false,
    build: {
      write: false,
      minify: true,
      rolldownOptions: {
        input: 'e2e/database-driver.ts',
        preserveEntrySignatures: 'strict',
        output: {
          entryFileNames: '__quizmon_database_fixture.js',
          chunkFileNames: '__quizmon_fixture/[name]-[hash].js',
          assetFileNames: '__quizmon_fixture/[name]-[hash][extname]',
        },
      },
    },
  });
  const bundled = Array.isArray(output) ? output[0] : output;
  if (!bundled || !('output' in bundled))
    throw new Error('Expected one database fixture bundle.');
  const chunk = bundled.output.find(
    (entry) => entry.type === 'chunk' && entry.isEntry,
  );
  if (!chunk || chunk.type !== 'chunk')
    throw new Error('Missing database fixture bundle.');

  const directory = await mkdtemp(join(tmpdir(), 'quizmon-e2e-'));
  const path = join(directory, 'database-fixture.json');
  try {
    const files = Object.fromEntries(
      bundled.output.map((asset) => [
        asset.fileName,
        Buffer.from(
          asset.type === 'chunk' ? asset.code : asset.source,
        ).toString('base64'),
      ]),
    );
    await writeFile(
      path,
      JSON.stringify({ body: chunk.code, files, worker, entry }),
    );
    process.env.QUIZMON_E2E_DATABASE_FIXTURE = path;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return () => rm(directory, { recursive: true, force: true });
}
