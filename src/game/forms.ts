import {
  formGroups,
  generations,
  type FormGroup,
  type PokemonCatalog,
} from './types';

export const getFormGroup = (name: string): FormGroup => {
  if (/-mega(?:-[xyz])?$/.test(name)) return 'mega';
  if (name.endsWith('-gmax')) return 'gigantamax';
  if (/-(alola|galar|hisui|paldea)(?:-|$)/.test(name)) return 'regional';
  return 'standard';
};

export const getFormGroupGenerations = (catalog: PokemonCatalog) =>
  Object.fromEntries(
    formGroups.map((group) => [
      group,
      generations.filter((generation) =>
        Object.entries(catalog.pokemon).some(
          ([name, pokemon]) =>
            pokemon.generation === generation && getFormGroup(name) === group,
        ),
      ),
    ]),
  ) as Record<FormGroup, (typeof generations)[number][]>;
