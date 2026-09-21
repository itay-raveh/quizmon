import type { EvolutionChain, Pokemon, PokemonSpecies } from 'pokenode-ts';
import { selectCatalogForms } from '../scripts/catalog-forms';
import {
  formEvolutionLinks,
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

const pokemon = (name: string, species = name, is_default = true) =>
  ({ name, species: { name: species }, is_default }) as Pokemon;
const form = (name: string, parent = name, is_default = true) =>
  ({
    name,
    pokemon: { name: parent },
    is_default,
    sprites: { front_default: `https://example.com/${name}.png` },
  }) as import('pokenode-ts').PokemonForm;

it('groups Cramorant feeding states into its ordinary catalog entry', () => {
  const names = ['cramorant', 'cramorant-gulping', 'cramorant-gorging'];
  const selection = selectCatalogForms(
    names.map((name) => pokemon(name, 'cramorant', name === 'cramorant')),
    names.map((name) => form(name)),
  );
  expect(selection.forms.map(({ name }) => name)).toEqual(['cramorant']);
  expect(selection.genericNames.has('cramorant')).toBe(true);
  for (const name of names)
    expect(selection.targets.get(name)).toBe('cramorant');
});

it('retains approved categories while grouping unlisted variants by default', () => {
  const names = [
    'example',
    'example-alola',
    'example-hisui',
    'example-galar',
    'example-paldea',
    'example-mega',
    'example-mega-x',
    'example-mega-y',
    'example-mega-z',
    'example-gmax',
    'example-large',
    'example-alola-cap',
    'example-unknown-future-form',
  ];
  const selection = selectCatalogForms(
    names.map((name) => pokemon(name, 'example', name === 'example')),
    names.map((name) => form(name)),
  );
  expect(selection.forms.map(({ name }) => name)).toEqual(names.slice(0, 10));
  expect(selection.targets.get('example-large')).toBe('example');
  expect(selection.targets.get('example-alola-cap')).toBe('example');
  expect(selection.targets.get('example-unknown-future-form')).toBe('example');
});

it.each([
  [
    'rotom',
    [
      'rotom',
      'rotom-heat',
      'rotom-wash',
      'rotom-frost',
      'rotom-fan',
      'rotom-mow',
    ],
  ],
  ['lycanroc', ['lycanroc-midday', 'lycanroc-midnight', 'lycanroc-dusk']],
  ['urshifu', ['urshifu-single-strike', 'urshifu-rapid-strike']],
] as const)('retains the explicit %s exceptions', (species, names) => {
  const selection = selectCatalogForms(
    names.map((name, index) => pokemon(name, species, index === 0)),
    names.map((name) => form(name)),
  );
  expect(selection.forms.map(({ name }) => name)).toEqual(names);
  if (species !== 'rotom')
    expect(selection.genericNames.has(names[0])).toBe(false);
});

it.each([
  [
    'darmanitan',
    'darmanitan-standard',
    'darmanitan-galar-standard',
    'darmanitan-galar-zen',
  ],
  ['meowstic', 'meowstic-male', 'meowstic-male-mega', 'meowstic-female-mega'],
  [
    'tatsugiri',
    'tatsugiri-curly',
    'tatsugiri-curly-mega',
    'tatsugiri-droopy-mega',
  ],
  [
    'toxtricity',
    'toxtricity-amped',
    'toxtricity-amped-gmax',
    'toxtricity-low-key-gmax',
  ],
])(
  'groups secondary variants within %s transformations',
  (species, base, retained, grouped) => {
    const names = [base, retained, grouped];
    const selection = selectCatalogForms(
      names.map((name) => pokemon(name, species, name === base)),
      names.map((name) => form(name)),
    );
    expect(selection.forms.map(({ name }) => name)).toEqual([base, retained]);
    expect(selection.targets.get(grouped)).toBe(retained);
  },
);

it('resolves explicit regional evolution edges independently of species defaults', () => {
  const chain = {
    chain: {
      species: { name: 'meowth' },
      evolution_details: [],
      evolves_to: [
        {
          species: { name: 'persian' },
          evolution_details: [{ base_form: null, evolved_form: null }],
          evolves_to: [],
        },
        {
          species: { name: 'perrserker' },
          evolution_details: [
            { base_form: { name: 'meowth-galar' }, evolved_form: null },
          ],
          evolves_to: [],
        },
      ],
    },
  } as unknown as EvolutionChain;
  const links = formEvolutionLinks(
    [chain],
    [
      pokemon('meowth'),
      pokemon('meowth-galar', 'meowth', false),
      pokemon('persian'),
      pokemon('perrserker'),
    ],
    [form('meowth'), form('meowth-galar'), form('persian'), form('perrserker')],
  );
  expect([...links.evolvesTo.get('meowth')!]).toEqual(['persian']);
  expect([...links.evolvesTo.get('meowth-galar')!]).toEqual(['perrserker']);
  expect(links.evolvesFrom.get('perrserker')).toBe('meowth-galar');
});

it('does not assign a post-regional species description to the original form', () => {
  expect(
    mainSeriesDescription(
      [
        note('alpha-sapphire', 'Original form'),
        note('legends-arceus', 'Hisuian form'),
      ],
      ['legends-arceus'],
    ),
  ).toBe('Original form');
});

it('merges authenticity evolution routes into the retained entries', () => {
  const chain = {
    chain: {
      species: { name: 'sinistea' },
      evolution_details: [],
      evolves_to: [
        {
          species: { name: 'polteageist' },
          evolution_details: [
            { base_form: null, evolved_form: null },
            {
              base_form: { name: 'sinistea-antique' },
              evolved_form: { name: 'polteageist-antique' },
            },
          ],
          evolves_to: [],
        },
      ],
    },
  } as unknown as EvolutionChain;
  const links = formEvolutionLinks(
    [chain],
    [
      pokemon('sinistea'),
      pokemon('sinistea-antique', 'sinistea', false),
      pokemon('polteageist'),
      pokemon('polteageist-antique', 'polteageist', false),
    ],
    [
      form('sinistea'),
      form('sinistea-antique'),
      form('polteageist'),
      form('polteageist-antique'),
    ],
  );
  expect([...links.evolvesTo].map(([name, next]) => [name, [...next]])).toEqual(
    [['sinistea', ['polteageist']]],
  );
  expect([...links.evolvesFrom]).toEqual([['polteageist', 'sinistea']]);
});

it('excludes forms without default sprites and clears their catalog targets', () => {
  const ordinary = form('example');
  const mega = {
    ...form('example-mega'),
    sprites: { ...ordinary.sprites, front_default: null },
  };
  const selection = selectCatalogForms(
    [pokemon('example'), pokemon('example-mega', 'example', false)],
    [ordinary, mega],
  );
  expect(selection.forms).toEqual([ordinary]);
  expect(selection.targets.get('example-mega')).toBeNull();
});
