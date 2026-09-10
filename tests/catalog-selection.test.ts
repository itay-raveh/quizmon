import type { EvolutionChain, Pokemon, PokemonSpecies } from 'pokenode-ts';
import {
  defaultEvolutionLinks,
  mainSeriesDescription,
} from '../scripts/catalog-selection';

const note = (version: string, flavor_text: string, language = 'en') =>
  ({
    version: { name: version },
    language: { name: language },
    flavor_text,
  }) as PokemonSpecies['flavor_text_entries'][number];

it('chooses the newest supported main-series note independent of array order', () => {
  expect(
    mainSeriesDescription([
      note('violet', 'Latest main-series entry'),
      note('red', 'Older entry'),
      note('sleep', 'Sleeping entry'),
      note('champions', 'Battle entry'),
      note('xd', 'Spin-off entry'),
      note('colosseum', 'Another spin-off'),
      note('mega-dimension', 'Other language', 'ja'),
    ]),
  ).toBe('Latest main-series entry');
});

it('includes Legends and Let’s Go, but never falls back to an unknown or spin-off game', () => {
  expect(
    mainSeriesDescription([
      note('legends-arceus', 'Legends'),
      note('shield', 'Shield'),
    ]),
  ).toBe('Legends');
  expect(mainSeriesDescription([note('lets-go-eevee', 'Let’s Go')])).toBe(
    'Let’s Go',
  );
  expect(
    mainSeriesDescription([
      note('sleep', 'Sleep'),
      note('future-game', 'Unknown'),
    ]),
  ).toBe('');
  expect(
    mainSeriesDescription([note('violet', '  '), note('scarlet', 'Available')]),
  ).toBe('Available');
});

const chain = (
  from: string,
  to: string[],
  forms: Record<
    string,
    { base_form?: { name: string }; evolved_form?: { name: string } }
  > = {},
) =>
  ({
    chain: {
      species: { name: from },
      evolution_details: [],
      evolves_to: to.map((name) => ({
        species: { name },
        evolution_details: [{ trigger: { name: 'level-up' }, ...forms[name] }],
        evolves_to: [],
      })),
    },
  }) as unknown as EvolutionChain;
const pokemon = (species: string, name = species) =>
  ({ name, species: { name: species } }) as Pokemon;

it.each([
  ['meowth', 'perrserker'],
  ['farfetchd', 'sirfetchd'],
  ['mr-mime', 'mr-rime'],
  ['corsola', 'cursola'],
  ['linoone', 'obstagoon'],
  ['yamask', 'runerigus'],
  ['wooper', 'clodsire'],
  ['qwilfish', 'overqwil'],
  ['sneasel', 'sneasler'],
  ['basculin', 'basculegion'],
])('does not link default %s to form-exclusive %s', (from, to) => {
  const links = defaultEvolutionLinks(
    [chain(from, [to], { [to]: { base_form: { name: `${from}-regional` } } })],
    [pokemon(from), pokemon(to)],
  );
  expect(links.evolvesTo.size).toBe(0);
  expect(links.evolvesFrom.size).toBe(0);
});

it('preserves valid branches and resolves species names to the shipped default forms', () => {
  const links = defaultEvolutionLinks(
    [
      chain('meowth', ['persian', 'perrserker'], {
        perrserker: { base_form: { name: 'meowth-galar' } },
      }),
      chain('darumaka', ['darmanitan']),
      chain('eevee', ['vaporeon', 'jolteon', 'flareon']),
    ],
    [
      'meowth',
      'persian',
      'perrserker',
      'darumaka',
      'eevee',
      'vaporeon',
      'jolteon',
      'flareon',
    ]
      .map((name) => pokemon(name))
      .concat(pokemon('darmanitan', 'darmanitan-standard')),
  );
  expect([...links.evolvesTo.get('meowth')!]).toEqual(['persian']);
  expect([...links.evolvesTo.get('darumaka')!]).toEqual([
    'darmanitan-standard',
  ]);
  expect(links.evolvesFrom.get('darmanitan-standard')).toBe('darumaka');
  expect(links.evolvesTo.get('eevee')?.size).toBe(3);
});

it('rejects methods whose evolved form is not the shipped default', () => {
  const links = defaultEvolutionLinks(
    [
      chain('pikachu', ['raichu'], {
        raichu: { evolved_form: { name: 'raichu-alola' } },
      }),
    ],
    [pokemon('pikachu'), pokemon('raichu')],
  );
  expect(links.evolvesTo.size).toBe(0);
  expect(links.alternateForms.has('pikachu')).toBe(true);
});

it('keeps the default link while marking alternate evolution forms as branching', () => {
  const defaultRoute = chain('kubfu', ['urshifu']);
  defaultRoute.chain.evolves_to[0]!.evolution_details.push({
    ...defaultRoute.chain.evolves_to[0]!.evolution_details[0]!,
    evolved_form: { name: 'urshifu-rapid-strike', url: '' },
  });
  const links = defaultEvolutionLinks(
    [defaultRoute],
    [pokemon('kubfu'), pokemon('urshifu', 'urshifu-single-strike')],
  );
  expect([...links.evolvesTo.get('kubfu')!]).toEqual(['urshifu-single-strike']);
  expect(links.alternateForms.has('kubfu')).toBe(true);
});
