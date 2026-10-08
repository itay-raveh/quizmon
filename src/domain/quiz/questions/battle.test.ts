import { attackMultiplier } from '../../pokemon/type-effectiveness.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { gameLevels } from '../level.ts';
import { buildQuestionType } from './registry.ts';
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

it('generates only non-neutral, non-immune damage questions at every level', () => {
  const catalog = pokemonData as unknown as PokemonCatalog;
  const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
    name,
    pokemon,
  }));
  for (const family of ['typeMatchup', 'superEffectiveAttacker'] as const) {
    for (const level of gameLevels) {
      if (!getQuestionVariant(family, level)) continue;
      for (let seed = 0; seed < 8; seed++) {
        const question = buildQuestionType(
          {
            catalog,
            pool,
            level,
            used: new Set(),
            random: createSeededRandom(`${family}-${level}-${seed}`),
          },
          family,
        )!;
        expect(question).toBeDefined();
        expect(question.visual?.kind).toBe(family);
        if (question.visual?.kind !== family)
          throw new Error('Missing matchup visual');
        expect([0.25, 0.5, 2, 4]).toContain(question.visual.multiplier);
        if (family === 'typeMatchup') {
          for (const type of question.answer.correctOptions) {
            expect(
              attackMultiplier(catalog, type, question.subject.types!),
            ).toBe(question.visual.multiplier);
          }
        }
      }
    }
  }
});
