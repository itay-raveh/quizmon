interface SearchEntry {
  label: string;
  normalized: string;
}

export const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const findSearchMatches = <Entry extends SearchEntry>(
  entries: readonly Entry[],
  query: string,
  limit = 6,
): Entry[] => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  return entries
    .filter(({ normalized }) => normalized.includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.normalized.startsWith(normalizedQuery);
      const rightStarts = right.normalized.startsWith(normalizedQuery);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit);
};
