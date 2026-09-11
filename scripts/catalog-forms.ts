import type { Pokemon, PokemonForm } from 'pokenode-ts';

const formExceptions = new Set([
  'rotom-heat',
  'rotom-wash',
  'rotom-frost',
  'rotom-fan',
  'rotom-mow',
  'groudon-primal',
  'kyogre-primal',
  'dialga-origin',
  'palkia-origin',
  'giratina-origin',
  'kyurem-black',
  'kyurem-white',
  'necrozma-dusk',
  'necrozma-dawn',
  'necrozma-ultra',
  'calyrex-ice',
  'calyrex-shadow',
  'hoopa-unbound',
  'shaymin-sky',
  'tornadus-therian',
  'thundurus-therian',
  'landorus-therian',
  'enamorus-therian',
  'deoxys-attack',
  'deoxys-defense',
  'deoxys-speed',
  'lycanroc-midday',
  'lycanroc-midnight',
  'lycanroc-dusk',
  'urshifu-single-strike',
  'urshifu-rapid-strike',
]);

const groupedForms: Record<string, string> = {
  'darmanitan-galar-zen': 'darmanitan-galar-standard',
  'magearna-original-mega': 'magearna-mega',
  'marowak-totem': 'marowak-alola',
  'meowstic-female-mega': 'meowstic-male-mega',
  'tatsugiri-droopy-mega': 'tatsugiri-curly-mega',
  'tatsugiri-stretchy-mega': 'tatsugiri-curly-mega',
  'toxtricity-low-key-gmax': 'toxtricity-amped-gmax',
};

export const groupedFormLabels: Record<string, string> = {
  'darmanitan-galar-standard': 'Galarian Darmanitan',
  'meowstic-male-mega': 'Mega Meowstic',
  'tatsugiri-curly-mega': 'Mega Tatsugiri',
  'toxtricity-amped-gmax': 'Gigantamax Toxtricity',
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
  const genericNames = new Set(
    [...defaults.values()].filter((key) => !formExceptions.has(key)),
  );
  const targets = new Map(
    forms.map((form): [string, string | null] => {
      const key = catalogFormKey(form);
      const species = parents.get(form.pokemon.name)?.species.name;
      if (!species) throw new Error(`${form.pokemon.name} has no species`);
      const defaultKey = defaults.get(species);
      if (!defaultKey) throw new Error(`${species} has no default Pokémon`);
      if (key === 'arceus-unknown') return [key, null];
      const normalized = groupedForms[key] ?? key.replace('-totem', '');
      if (
        normalized === defaultKey ||
        formExceptions.has(normalized) ||
        /(?:-(?:alola|galar|hisui|paldea)|-galar-standard|-paldea-(?:aqua|blaze|combat)-breed)$/.test(
          normalized,
        ) ||
        /-(mega(?:-[xyz])?|gmax)$/.test(normalized)
      )
        return [key, normalized];
      return [key, defaultKey];
    }),
  );
  const selected = forms.filter(
    (form) => targets.get(catalogFormKey(form)) === catalogFormKey(form),
  );
  const missingSprites = new Set(
    selected.filter((form) => !form.sprites.front_default).map(catalogFormKey),
  );
  for (const [key, target] of targets) {
    if (target !== null && missingSprites.has(target)) targets.set(key, null);
  }
  const retained = selected.filter(
    (form) => !missingSprites.has(catalogFormKey(form)),
  );
  const retainedKeys = new Set(retained.map(catalogFormKey));
  for (const [key, target] of targets) {
    if (target !== null && !retainedKeys.has(target))
      throw new Error(`${key} maps to missing catalog form ${target}`);
  }
  return { forms: retained, defaults, genericNames, targets };
};
