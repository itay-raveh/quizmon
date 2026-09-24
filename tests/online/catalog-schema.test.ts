import assert from 'node:assert/strict';
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
