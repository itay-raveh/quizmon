import { pokeapi } from './pokeapi';
import { knownFormCategories, type FormCategory } from './types/FormCategory';
import type { GenRoman } from './types/GenRoman';

export interface PokemonInitialData {
  formCategory: FormCategory;
  generation: GenRoman;
}

export type PokemonsInitialData = { [name: string]: PokemonInitialData };

export const getPokemonsInitialData = async () => {
  const pokemonResources = await pokeapi.pokemon.listPokemons(
    0,
    9999 // all of them, hopefully
  );

  const pokemons = await Promise.all(
    pokemonResources.results.map((pokemonResource) =>
      pokeapi.pokemon.getPokemonByName(pokemonResource.name)
    )
  );

  const pokemonsInitialData: PokemonsInitialData =
    Object.fromEntries<PokemonInitialData>(
      await Promise.all(
        pokemons.map(async (pokemon) => {
          // assuming first form is default form
          const defaultFormName = pokemon.forms[0].name;

          const defaultForm = await pokeapi.pokemon.getPokemonFormByName(
            defaultFormName
          );

          const versionGroup = await pokeapi.game.getVersionGroupByName(
            defaultForm.version_group.name
          );

          // transform the `VersionGroup` gen name to `GenRoman`
          const generation = versionGroup.generation.name
            .substring('generation-'.length)
            .toUpperCase() as GenRoman;

          // determine form category
          let formCategory: FormCategory = 'other';
          if (pokemon.is_default) formCategory = 'default';
          // if a known category is the pokemon name, that is the category
          else
            knownFormCategories.forEach((category) => {
              if (pokemon.name.includes(`-${category}`))
                formCategory = category;
            });

          return [pokemon.name, { generation, formCategory }] as const;
        })
      )
    );

  return pokemonsInitialData;
};
