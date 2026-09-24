import type { PokemonCatalog } from '@/domain/pokemon/types';

import { isRecord } from '@/lib/validation';

export const parsePokemonCatalog = (value: unknown): PokemonCatalog => {
  if (
    !isRecord(value) ||
    typeof value.contentVersion !== 'number' ||
    !isRecord(value.pokemon) ||
    Object.keys(value.pokemon).length === 0 ||
    !isRecord(value.typeRelations)
  ) {
    throw new Error('The Pokémon catalog has an invalid structure.');
  }

  return value as unknown as PokemonCatalog;
};
