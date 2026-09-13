import type { Pokemon, PokemonSpecies } from 'pokenode-ts';
import {
  statNames,
  type PokemonKnowledge,
  type StatName,
} from '../src/domain/pokemon/types.ts';

export const extractPokemonKnowledge = (
  pokemon: Pokemon,
  species: PokemonSpecies,
): Pick<
  PokemonKnowledge,
  | 'height'
  | 'weight'
  | 'isBaby'
  | 'isUnevolved'
  | 'eggGroups'
  | 'abilitySlots'
  | 'evYield'
> => {
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
    isBaby: typeof species.is_baby === 'boolean' ? species.is_baby : undefined,
    isUnevolved:
      species.evolves_from_species === null
        ? true
        : species.evolves_from_species?.name
          ? false
          : undefined,
    eggGroups: species.egg_groups?.length
      ? [...new Set(species.egg_groups.map(({ name }) => name))].sort()
      : undefined,
    abilitySlots:
      pokemon.abilities?.length &&
      pokemon.abilities.every(
        ({ is_hidden, slot, ability }) =>
          typeof is_hidden === 'boolean' &&
          Number.isSafeInteger(slot) &&
          slot > 0 &&
          ability.name,
      )
        ? pokemon.abilities
            .map(({ ability, is_hidden, slot }) => ({
              name: ability.name,
              hidden: is_hidden,
              slot,
            }))
            .sort((a, b) => a.slot - b.slot)
        : undefined,
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
