import Fuse from 'fuse.js';
import { formatPokemonName } from './format';

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

export const createPokemonSearchEntry = <Pokemon extends { name: string }>(
  pokemon: Pokemon,
) => {
  const label = formatPokemonName(pokemon.name);
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
    ignoreLocation: true,
    ignoreFieldNorm: true,
    includeScore: true,
  });
  return (query: string): Entry[] => {
    const normalized = normalizeSearch(query);
    if (!normalized) return [];
    return fuse
      .search(normalized)
      .sort((left, right) => {
        const rank = (entry: Entry) => {
          const values = [entry.normalized, ...(entry.aliases ?? [])];
          if (values.includes(normalized)) return 0;
          if (values.some((value) => value.startsWith(normalized))) return 1;
          if (values.some((value) => value.includes(normalized))) return 2;
          return 3;
        };
        return (
          rank(left.item) - rank(right.item) ||
          (left.score ?? 0) - (right.score ?? 0) ||
          left.item.label.localeCompare(right.item.label)
        );
      })
      .map(({ item }) => item);
  };
};
