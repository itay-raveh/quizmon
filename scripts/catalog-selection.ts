import {
  flattenChain,
  type EvolutionChain,
  type Pokemon,
  type PokemonSpecies,
} from 'pokenode-ts';

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
): string => {
  const english = entries.filter(({ language }) => language.name === 'en');
  for (const version of mainSeriesVersions.toReversed()) {
    const entry = english.find(
      (entry) => entry.version.name === version && entry.flavor_text.trim(),
    );
    if (entry) return entry.flavor_text;
  }
  return '';
};

export const defaultEvolutionLinks = (
  chains: EvolutionChain[],
  pokemon: Pokemon[],
) => {
  const names = new Map(
    pokemon.map((entry) => [entry.species.name, entry.name]),
  );
  const evolvesTo = new Map<string, Set<string>>();
  const evolvesFrom = new Map<string, string>();
  const alternateForms = new Set<string>();
  for (const chain of chains) {
    for (const step of flattenChain(chain)) {
      const from = names.get(step.from.name);
      const to = names.get(step.to.name);
      if (!from || !to)
        throw new Error(
          `Missing default form for evolution ${step.from.name} → ${step.to.name}`,
        );
      if (
        step.details.some(
          (detail) =>
            (!detail.base_form || detail.base_form.name === from) &&
            detail.evolved_form &&
            detail.evolved_form.name !== to,
        )
      )
        alternateForms.add(from);
      if (
        !step.details.some(
          (detail) =>
            (!detail.base_form || detail.base_form.name === from) &&
            (!detail.evolved_form || detail.evolved_form.name === to),
        )
      )
        continue;
      const destinations = evolvesTo.get(from) ?? new Set<string>();
      destinations.add(to);
      evolvesTo.set(from, destinations);
      evolvesFrom.set(to, from);
    }
  }
  return { evolvesTo, evolvesFrom, alternateForms };
};
