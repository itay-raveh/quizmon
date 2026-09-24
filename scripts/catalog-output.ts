import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import type { PokemonCatalog } from '../src/domain/pokemon/types.ts';
import { catalogSchema } from './catalog-schema.ts';
import type { EditorialTopicCatalog } from './editorial-topic-catalog.ts';

export const writeCatalogFiles = async (
  catalog: PokemonCatalog,
  directory: URL,
): Promise<void> => {
  catalogSchema.parse(catalog);
  await mkdir(directory, { recursive: true });
  const root = new URL('pokemon.json', directory);
  let previous: string[];
  try {
    previous =
      (JSON.parse(await readFile(root, 'utf8')) as { topicFiles?: string[] })
        .topicFiles ?? [];
  } catch {
    previous = [];
  }
  const { topics, ...pokemon } = catalog;
  const topicFiles: string[] = [];
  if (topics && 'gaps' in topics)
    await writeFile(
      new URL('catalog-gaps.json', directory),
      await format(JSON.stringify(topics.gaps), { parser: 'json' }),
    );
  if (topics)
    for (const [key, values] of Object.entries(topics)) {
      if (key === 'gaps') continue;
      const batches: unknown[] = [];
      if (Array.isArray(values)) {
        let batch: unknown[] = [],
          size = 0;
        for (const value of values) {
          const bytes = Buffer.byteLength(JSON.stringify(value));
          if (size + bytes > 800_000 && batch.length) {
            batches.push(batch);
            batch = [];
            size = 0;
          }
          batch.push(value);
          size += bytes;
        }
        batches.push(batch);
      } else batches.push(values);
      for (const [index, values] of batches.entries()) {
        const file = `topics-${key}-${index}.json`;
        const output = await format(
          JSON.stringify({
            contentVersion: catalog.contentVersion,
            key,
            values,
          }),
          { parser: 'json' },
        );
        if (Buffer.byteLength(output) > 5 * 1024 * 1024)
          throw new Error(`Catalog chunk exceeds offline asset limit: ${file}`);
        await writeFile(new URL(file, directory), output);
        topicFiles.push(file);
      }
    }
  await writeFile(
    root,
    await format(
      JSON.stringify({ ...pokemon, ...(topics ? { topicFiles } : {}) }),
      { parser: 'json' },
    ),
  );
  for (const file of previous)
    if (/^topics-[a-zA-Z]+-\d+\.json$/.test(file) && !topicFiles.includes(file))
      await rm(new URL(file, directory), { force: true });
};

export const readCatalogFiles = async (
  directory: URL,
): Promise<PokemonCatalog> => {
  const value = JSON.parse(
    await readFile(new URL('pokemon.json', directory), 'utf8'),
  ) as PokemonCatalog & { topicFiles?: string[] };
  const { topicFiles, ...catalog } = value;
  if (!topicFiles) return catalog;
  const topics: Record<string, unknown> = {};
  for (const file of topicFiles) {
    if (!/^topics-[a-zA-Z]+-\d+\.json$/.test(file))
      throw new Error('Invalid topic file name');
    const chunk = JSON.parse(
      await readFile(new URL(file, directory), 'utf8'),
    ) as { contentVersion: number; key: string; values: unknown };
    if (chunk.contentVersion !== catalog.contentVersion)
      throw new Error('Mismatched topic content version');
    topics[chunk.key] = Array.isArray(chunk.values)
      ? [
          ...((topics[chunk.key] as unknown[]) ?? []),
          ...(chunk.values as unknown[]),
        ]
      : chunk.values;
  }
  return {
    ...catalog,
    topics: topics as unknown as NonNullable<PokemonCatalog['topics']>,
  };
};

export const readEditorialCatalogFiles = async (directory: URL) => {
  const catalog = await readCatalogFiles(directory);
  if (!catalog.topics) throw new Error('Missing topic catalog');
  const gaps = JSON.parse(
    await readFile(new URL('catalog-gaps.json', directory), 'utf8'),
  ) as EditorialTopicCatalog['gaps'];
  return {
    ...catalog,
    topics: { ...catalog.topics, gaps } as EditorialTopicCatalog,
  };
};
