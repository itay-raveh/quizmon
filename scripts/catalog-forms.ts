import type { Pokemon, PokemonForm } from 'pokenode-ts';

const singleEntrySpecies = new Set([
  'pichu',
  'unown',
  'mothim',
  'shellos',
  'gastrodon',
  'deerling',
  'sawsbuck',
  'frillish',
  'jellicent',
  'keldeo',
  'scatterbug',
  'spewpa',
  'vivillon',
  'flabebe',
  'florges',
  'furfrou',
  'xerneas',
  'sinistea',
  'polteageist',
  'zarude',
  'maushold',
  'dudunsparce',
  'koraidon',
  'miraidon',
  'poltchageist',
  'sinistcha',
]);

const groupedForms: Record<string, readonly string[]> = {
  alcremie: ['alcremie-gmax'],
  floette: ['floette-eternal', 'floette-mega'],
  pyroar: ['pyroar-mega'],
  pikachu: ['pikachu-gmax', 'pikachu-starter'],
};

// Default variety keys are already stored in player saves and round history.
export const catalogFormKey = (form: PokemonForm): string =>
  form.is_default ? form.pokemon.name : form.name;

export const selectCatalogForms = <Form extends PokemonForm>(
  pokemon: readonly Pokemon[],
  forms: readonly Form[],
) => {
  const parents = new Map(pokemon.map((entry) => [entry.name, entry]));
  const defaults = new Map(
    pokemon
      .filter((entry) => entry.is_default)
      .map((entry) => [entry.species.name, entry.name]),
  );
  const genericNames = new Set<string>();
  const targets = new Map(
    forms.map((form): [string, string | null] => {
      const key = catalogFormKey(form);
      const species = parents.get(form.pokemon.name)?.species.name;
      if (!species) throw new Error(`${form.pokemon.name} has no species`);
      if (key === 'arceus-unknown') return [key, null];
      if (
        singleEntrySpecies.has(species) ||
        (Object.hasOwn(groupedForms, species) &&
          !groupedForms[species]!.includes(key))
      ) {
        const target = defaults.get(species);
        if (!target) throw new Error(`${species} has no default Pokémon`);
        genericNames.add(target);
        return [key, target];
      }
      if (species === 'minior')
        return [
          key,
          key.endsWith('-meteor') ? 'minior-red-meteor' : 'minior-red',
        ];
      if (key === 'magearna-original') return [key, 'magearna'];
      if (key === 'magearna-original-mega') return [key, 'magearna-mega'];
      if (key === 'marowak-totem') return [key, 'marowak-alola'];
      return [key, key.replace('-totem', '')];
    }),
  );
  const retained = forms.filter(
    (form) => targets.get(catalogFormKey(form)) === catalogFormKey(form),
  );
  const retainedKeys = new Set(retained.map(catalogFormKey));
  for (const [key, target] of targets) {
    if (target !== null && !retainedKeys.has(target))
      throw new Error(`${key} maps to missing catalog form ${target}`);
  }
  return { forms: retained, defaults, genericNames, targets };
};
