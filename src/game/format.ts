const scoreFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

export const formatPokemonName = (name: string): string =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatPokedexNumber = (dexNumber: number): string =>
  `No. ${String(dexNumber).padStart(4, '0')}`;

export const formatPokemonTypes = (types: readonly string[]): string =>
  types.map(formatPokemonName).join(' and ');

export const formatScore = (score: number): string =>
  scoreFormatter.format(score);
