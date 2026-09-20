import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { buildPokemonCatalogArchive } from '../build/pokemon-catalog';
import { catalog } from './fixtures/catalog';
import { gameVersions } from '../src/domain/versions';

test('packages the exact gameplay catalog within the offline asset limit', async () => {
  expect(catalog.contentVersion).toBe(gameVersions.content);
  const archive = await buildPokemonCatalogArchive(
    pathToFileURL(resolve('src/domain/pokemon/data') + '/'),
  );
  const unpacked: unknown = JSON.parse(gunzipSync(archive).toString());
  expect(JSON.stringify(unpacked)).toBe(JSON.stringify(catalog));
  expect(archive.byteLength).toBeLessThanOrEqual(5 * 1024 * 1024);
}, 15_000);
