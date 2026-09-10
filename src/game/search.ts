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

export const findSearchMatches = <Entry extends SearchEntry>(
  entries: readonly Entry[],
  normalizedQuery: string,
): Entry[] => {
  if (!normalizedQuery) return [];

  return entries
    .filter(
      ({ normalized, aliases }) =>
        normalized.includes(normalizedQuery) ||
        aliases?.some((alias) => alias.includes(normalizedQuery)),
    )
    .sort((left, right) => {
      const leftStarts = left.normalized.startsWith(normalizedQuery);
      const rightStarts = right.normalized.startsWith(normalizedQuery);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.label.localeCompare(right.label);
    })
    .slice(0, 6);
};
