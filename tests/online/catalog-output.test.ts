import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { PokemonCatalog } from '../../src/domain/pokemon/types.ts';
import { writeCatalogFiles } from '../../scripts/catalog-output.ts';

await test('catalog update leaves a malformed previous catalog untouched', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'quizmon-catalog-'));
  const file = join(directory, 'pokemon.json');
  try {
    await writeFile(file, '{bad json');
    await assert.rejects(
      writeCatalogFiles({} as PokemonCatalog, new URL(`file://${directory}/`)),
      SyntaxError,
    );
    assert.equal(await readFile(file, 'utf8'), '{bad json');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
