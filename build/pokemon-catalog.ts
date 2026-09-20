import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';
import { readCatalogFiles } from '../scripts/catalog-output.ts';

const directory = new URL('../src/domain/pokemon/data/', import.meta.url);
const moduleId = 'virtual:pokemon-catalog-url';
const resolvedId = '\0' + moduleId;
// A .gz suffix makes some static servers decode the body before our gzip stream.
// https://github.com/vitejs/vite/issues/12266
const developmentUrl = '/@quizmon/pokemon-catalog.bin';
const compress = promisify(gzip);

export const buildPokemonCatalogArchive = async (source = directory) =>
  compress(JSON.stringify(await readCatalogFiles(source)));

export const pokemonCatalog = (): Plugin => {
  let building = false;
  let archive: Promise<Buffer> | undefined;
  const load = () => (archive ??= buildPokemonCatalogArchive());
  return {
    name: 'quizmon-pokemon-catalog',
    configResolved(config) {
      building = config.command === 'build';
    },
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      if (!building) return `export default ${JSON.stringify(developmentUrl)}`;
      const reference = this.emitFile({
        type: 'asset',
        name: 'pokemon-catalog.bin',
        source: await load(),
      });
      return `export default import.meta.ROLLDOWN_FILE_URL_${reference}`;
    },
    configureServer(server) {
      server.watcher.add(fileURLToPath(directory));
      server.watcher.on('change', (file) => {
        if (!file.startsWith(fileURLToPath(directory))) return;
        archive = undefined;
        server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use(developmentUrl, (_request, response, next) => {
        void load().then((data) => {
          response.setHeader('Content-Type', 'application/octet-stream');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(data);
        }, next);
      });
    },
  };
};
