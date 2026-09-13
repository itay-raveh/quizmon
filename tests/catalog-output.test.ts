import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCatalogFiles, writeCatalogFiles } from '../scripts/catalog-output';
import { assembleTopicCatalog } from '../src/domain/quiz/topic-catalog-loading';
import { catalog } from './fixtures/catalog';

it('ships a complete, same-version topic manifest within the existing offline file limit', async () => {
  const root = JSON.parse(
    await readFile('src/domain/pokemon/data/pokemon.json', 'utf8'),
  ) as { contentVersion: number; topicFiles: string[] };
  const chunks = await Promise.all(
    root.topicFiles.map(async (file) => {
      const text = await readFile(
        join('src/domain/pokemon/data', file),
        'utf8',
      );
      expect(Buffer.byteLength(text)).toBeLessThanOrEqual(5 * 1024 * 1024);
      return JSON.parse(text) as unknown;
    }),
  );
  expect(assembleTopicCatalog(chunks, root.contentVersion)).toEqual(
    catalog.topics,
  );
  expect(() =>
    assembleTopicCatalog(chunks.slice(1), root.contentVersion),
  ).toThrow();
  expect(() => assembleTopicCatalog(chunks, root.contentVersion + 1)).toThrow();
});
it('preserves generated topics when refreshing only Pokémon data', async () => {
  const path = await mkdtemp(join(tmpdir(), 'quizmon-catalog-test-'));
  const directory = pathToFileURL(path + '/');
  try {
    const small = {
      ...catalog,
      pokemon: { pikachu: catalog.pokemon.pikachu! },
      topics: {
        ...catalog.topics!,
        items: catalog.topics!.items.slice(0, 2),
        moves: [],
        encounters: [],
        evolutions: [],
        locations: [],
      },
    };
    await writeCatalogFiles(small, directory);
    expect(await readCatalogFiles(directory)).toEqual(small);
    const loaded = await readCatalogFiles(directory);
    loaded.pokemon.pikachu!.height = 5;
    await writeCatalogFiles(loaded, directory);
    expect((await readCatalogFiles(directory)).topics).toEqual(small.topics);
    expect(
      (await readdir(directory)).every(
        (file) => file === 'pokemon.json' || file.startsWith('topics-'),
      ),
    ).toBe(true);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
