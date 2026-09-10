import {
  flattenChain,
  type EvolutionChain,
  type Pokemon,
  type PokemonForm,
  type PokemonSpecies,
} from 'pokenode-ts';
import { catalogFormKey, selectCatalogForms } from './catalog-forms.ts';

const mainSeriesVersions = [
  'red-japan',
  'green-japan',
  'blue-japan',
  'red',
  'blue',
  'yellow',
  'gold',
  'silver',
  'crystal',
  'ruby',
  'sapphire',
  'firered',
  'leafgreen',
  'emerald',
  'diamond',
  'pearl',
  'platinum',
  'heartgold',
  'soulsilver',
  'black',
  'white',
  'black-2',
  'white-2',
  'x',
  'y',
  'omega-ruby',
  'alpha-sapphire',
  'sun',
  'moon',
  'ultra-sun',
  'ultra-moon',
  'lets-go-pikachu',
  'lets-go-eevee',
  'sword',
  'shield',
  'the-isle-of-armor-sword',
  'the-isle-of-armor-shield',
  'the-crown-tundra-sword',
  'the-crown-tundra-shield',
  'brilliant-diamond',
  'shining-pearl',
  'legends-arceus',
  'scarlet',
  'violet',
  'the-teal-mask-scarlet',
  'the-teal-mask-violet',
  'the-indigo-disk-scarlet',
  'the-indigo-disk-violet',
  'legends-za',
  'mega-dimension',
];

export const mainSeriesDescription = (
  entries: PokemonSpecies['flavor_text_entries'],
  beforeVersions: readonly string[] = [],
): string => {
  const cutoff = Math.min(
    ...beforeVersions
      .map((version) => mainSeriesVersions.indexOf(version))
      .filter((index) => index >= 0),
  );
  const english = entries.filter(
    ({ language, version }) =>
      language.name === 'en' &&
      mainSeriesVersions.indexOf(version.name) < cutoff,
  );
  for (const version of mainSeriesVersions.toReversed()) {
    const entry = english.find(
      (entry) => entry.version.name === version && entry.flavor_text.trim(),
    );
    if (entry) return entry.flavor_text;
  }
  return '';
};

export const formEvolutionLinks = (
  chains: EvolutionChain[],
  pokemon: Pokemon[],
  forms: PokemonForm[],
  { targets, defaults } = selectCatalogForms(pokemon, forms),
) => {
  const formKeys = new Map<string, string | null | undefined>();
  for (const form of forms) {
    const target = targets.get(catalogFormKey(form));
    formKeys.set(form.name, target);
    if (form.is_default) formKeys.set(form.pokemon.name, target);
  }
  const evolvesTo = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();
  for (const chain of chains) {
    for (const step of flattenChain(chain)) {
      for (const detail of step.details) {
        const from = detail.base_form
          ? formKeys.get(detail.base_form.name)
          : defaults.get(step.from.name);
        const to = detail.evolved_form
          ? formKeys.get(detail.evolved_form.name)
          : defaults.get(step.to.name);
        if (!from || !to)
          throw new Error(
            `Missing form for evolution ${step.from.name} → ${step.to.name}`,
          );
        const destinations = evolvesTo.get(from) ?? new Set<string>();
        destinations.add(to);
        evolvesTo.set(from, destinations);
        const origins = parents.get(to) ?? new Set<string>();
        origins.add(from);
        parents.set(to, origins);
      }
    }
  }
  const evolvesFrom = new Map(
    [...parents].flatMap(([name, origins]) =>
      origins.size === 1 ? [[name, [...origins][0]!] as const] : [],
    ),
  );
  return { evolvesTo, evolvesFrom };
};
