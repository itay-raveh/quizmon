import { assembleTopicCatalog } from '../domain/quiz/topic-catalog-loading';
import { isRecord } from './validation';
import { parsePokemonCatalog } from '../domain/pokemon/catalog';

import catalogUrl from '../domain/pokemon/data/pokemon.json?url';

import type { PokemonCatalog } from '@/domain/pokemon/types';

const topicUrls = import.meta.glob<string>(
  '../domain/pokemon/data/topics-*.json',
  { eager: true, query: '?url&no-inline', import: 'default' },
);

export const fetchPokemonCatalog = async (): Promise<PokemonCatalog> => {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`The Pokémon catalog request failed (${response.status}).`);
  }

  const value: unknown = await response.json();
  const catalog = parsePokemonCatalog(value);
  if (!isRecord(value) || value.topicFiles === undefined) return catalog;
  if (
    !Array.isArray(value.topicFiles) ||
    !value.topicFiles.every(
      (file) =>
        typeof file === 'string' &&
        Object.hasOwn(topicUrls, `../domain/pokemon/data/${file}`),
    )
  )
    throw new Error('The topic catalog manifest is invalid.');
  const chunks = await Promise.all(
    value.topicFiles.map(async (file) => {
      const response = await fetch(
        topicUrls[`../domain/pokemon/data/${file}`]!,
      );
      if (!response.ok)
        throw new Error('A topic catalog file could not be loaded.');
      return response.json() as Promise<unknown>;
    }),
  );
  return {
    ...catalog,
    topics: assembleTopicCatalog(chunks, catalog.contentVersion),
  };
};
