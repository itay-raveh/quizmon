import pokemonLabels from './data/pokemon-labels.json' with { type: 'json' };
import type { Generation } from './types.ts';

export const formatPokemonName = (name: string): string =>
  (pokemonLabels as Record<string, string>)[name] ??
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatPokedexNumber = (dexNumber: number): string =>
  `No. ${String(dexNumber).padStart(4, '0')}`;

const formatPokemonTypes = (types: readonly string[]): string =>
  types.map(formatPokemonName).join(' and ');

export const formatPokemonTypeAnnouncement = (
  types: readonly string[],
  name?: string,
): string =>
  `${name ? `${formatPokemonName(name)} ${types.length === 1 ? 'type' : 'types'}` : types.length === 1 ? 'Type' : 'Types'}: ${formatPokemonTypes(types)}.`;

export const formatTypeMultiplier = (multiplier: number): string =>
  ({ 0.25: '¼', 0.5: '½' })[multiplier] ?? String(multiplier);

export const formatGeneration = (generation: Generation): string =>
  `Generation ${generation}`;
