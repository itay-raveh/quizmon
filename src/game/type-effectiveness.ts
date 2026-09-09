import type { PokemonCatalog } from './types';

export const attackMultiplier = (
  catalog: Pick<PokemonCatalog, 'typeRelations'>,
  attackType: string,
  defenderTypes: readonly string[],
): number => {
  const relations = catalog.typeRelations[attackType];
  if (!relations) return 1;
  return defenderTypes.reduce((multiplier, defenderType) => {
    if (relations.noneTo.includes(defenderType)) return 0;
    if (relations.doubleTo.includes(defenderType)) return multiplier * 2;
    if (relations.halfTo.includes(defenderType)) return multiplier / 2;
    return multiplier;
  }, 1);
};
