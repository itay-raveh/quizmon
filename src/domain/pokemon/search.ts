import Fuse from 'fuse.js';
import { formatPokemonName } from './format.ts';

interface SearchEntry {
  label: string;
  normalized: string;
  aliases?: string[];
}

export const normalizeSearch = (value: string): string =>
  value
    .replaceAll('♀', ' female ')
    .replaceAll('♂', ' male ')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const createPokemonSearchEntry = <
  Pokemon extends { name: string; label?: string },
>(
  pokemon: Pokemon,
) => {
  const label = pokemon.label ?? formatPokemonName(pokemon.name);
  return {
    ...pokemon,
    label,
    normalized: normalizeSearch(label),
    aliases: [normalizeSearch(pokemon.name)],
  };
};

export const createSearch = <Entry extends SearchEntry>(
  entries: readonly Entry[],
) => {
  const fuse = new Fuse(entries, {
    keys: ['normalized', 'aliases'],
    threshold: 0.4,
    ignoreFieldNorm: true,
  });
  return (query: string): Entry[] => {
    const normalized = normalizeSearch(query);
    if (!normalized) return [];
    return fuse.search(normalized).map(({ item }) => item);
  };
};
