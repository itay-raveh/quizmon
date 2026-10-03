import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildCounterPickQuestion } from './battle.ts';

it('uses distinct type combinations for Counter pick answers', () => {
  const catalog = pokemonData as unknown as PokemonCatalog;
  const names = [
    'murkrow',
    'totodile',
    'chinchou',
    'wailord',
    'lumineon',
    'charmander',
    'oddish',
    'rattata',
  ];
  const question = buildCounterPickQuestion({
    catalog,
    level: 3,
    pool: names.map((name) => ({ name, pokemon: catalog.pokemon[name]! })),
    variant: getQuestionVariant('superEffectiveAttacker', 3)!.variant,
    random: () => 0,
    used: new Set(names.filter((name) => name !== 'murkrow')),
  });

  expect(question?.subject.name).toBe('murkrow');
  expect(question?.answer.correctOptions).toEqual(['chinchou']);
  expect(question?.options).toHaveLength(4);
  expect(
    new Set(
      question?.options.map((name) =>
        [...catalog.pokemon[name]!.types].sort().join(','),
      ),
    ).size,
  ).toBe(4);
});
