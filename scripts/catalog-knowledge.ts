import type { Pokemon } from 'pokenode-ts';
import {
  statNames,
  type PokemonKnowledge,
  type StatName,
} from '../src/domain/pokemon/types.ts';

export const extractPokemonKnowledge = (
  pokemon: Pokemon,
): Pick<PokemonKnowledge, 'height' | 'weight' | 'evYield'> => {
  const measurement = (value: number) =>
    Number.isSafeInteger(value) && value > 0 ? value : undefined;
  const stats = pokemon.stats ?? [];
  const validYield = statNames.every((name) => {
    const matches = stats.filter(({ stat }) => stat.name === name);
    return (
      matches.length === 1 &&
      Number.isSafeInteger(matches[0]!.effort) &&
      matches[0]!.effort >= 0
    );
  });
  return {
    height: measurement(pokemon.height),
    weight: measurement(pokemon.weight),
    evYield: validYield
      ? (Object.fromEntries(
          statNames.map((name) => [
            name,
            stats.find(({ stat }) => stat.name === name)!.effort,
          ]),
        ) as Record<StatName, number>)
      : undefined,
  };
};
