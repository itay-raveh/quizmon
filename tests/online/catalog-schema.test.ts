import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { catalogSchema } from '../../scripts/catalog-schema.ts';
import {
  readCatalogFiles,
  writeCatalogFiles,
} from '../../scripts/catalog-output.ts';

const catalog = await readCatalogFiles(
  new URL('../../src/domain/pokemon/data/', import.meta.url),
);

void test('generated catalog rejects malformed game and topic data before writing', async () => {
  assert.equal(catalogSchema.safeParse(catalog).success, true);
  const pokemon = catalog.pokemon.bulbasaur!;
  const stats = pokemon.stats;
  pokemon.stats = { ...stats };
  Reflect.set(pokemon.stats, 'hp', 'invalid');
  await assert.rejects(
    writeCatalogFiles(
      catalog,
      new URL('../../.wrangler/invalid-catalog/', import.meta.url),
    ),
  );
  pokemon.stats = stats;

  const currentBack = pokemon.identitySprites.currentBack;
  Reflect.set(pokemon.identitySprites, 'currentBack', 42);
  assert.equal(catalogSchema.safeParse(catalog).success, false);
  pokemon.identitySprites.currentBack = currentBack;

  const types = pokemon.types;
  Reflect.set(pokemon, 'types', [42]);
  assert.equal(catalogSchema.safeParse(catalog).success, false);
  pokemon.types = types;

  const item = catalog.topics!.items[0]!;
  const generations = item.generations;
  Reflect.set(item, 'generations', ['invalid']);
  assert.equal(catalogSchema.safeParse(catalog).success, false);
  item.generations = generations;
});

void test('a Pokémon metadata refresh preserves existing topic partitions and their bytes', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'quizmon-catalog-'));
  const directory = pathToFileURL(`${temporary}/`);
  const topicFile = 'topics-moves-0.json';
  const topic = await readFile(
    new URL(`../../src/domain/pokemon/data/${topicFile}`, import.meta.url),
  );
  try {
    await writeFile(
      new URL('pokemon.json', directory),
      JSON.stringify({ topicFiles: [topicFile] }),
    );
    await writeFile(new URL(topicFile, directory), topic);
    const changed = structuredClone(catalog);
    changed.pokemon.bulbasaur!.identitySprites.currentBack = null;
    await writeCatalogFiles(changed, directory, false);
    const result: unknown = JSON.parse(
      await readFile(new URL('pokemon.json', directory), 'utf8'),
    );
    assert.equal(
      catalogSchema.parse(result).pokemon.bulbasaur!.identitySprites
        .currentBack,
      null,
    );
    assert.partialDeepStrictEqual(result, { topicFiles: [topicFile] });
    assert.deepEqual(await readFile(new URL(topicFile, directory)), topic);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
