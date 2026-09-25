import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import evolutionData from '../../pokemon/data/topics-evolutions-0.json' with { type: 'json' };
import gameData from '../../pokemon/data/topics-games-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { buildQuestionType } from './registry.ts';

const catalog = {
  ...pokemonData,
  topics: {
    evolutions: evolutionData.values,
    games: gameData.values,
  },
} as unknown as PokemonCatalog;
const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
  name,
  pokemon,
}));
const build = (
  difficulty: 3 | 4 | 5,
  seed: string,
  selected = pool,
  source = catalog,
) =>
  buildQuestionType(
    {
      catalog: source,
      difficulty,
      pool: selected,
      random: createSeededRandom(seed),
      used: new Set(),
    },
    'evolution-conditions',
  );

it('uses one condition at levels 3 and 4 and reserves multi-select and exact levels for level 5', () => {
  const levelFiveInteractions = new Set<string>();
  for (const level of [3, 4, 5] as const)
    for (let seed = 0; seed < 10; seed++) {
      const question = build(level, `${level}:${seed}`);
      expect(question).toBeDefined();
      expect(question!.options).toHaveLength(4);
      expect(new Set(question!.options).size).toBe(4);
      expect(
        question!.answer.correctOptions.every((option) =>
          question!.options.includes(option),
        ),
      ).toBe(true);
      if (level === 5) {
        levelFiveInteractions.add(question!.answer.interaction);
        if (question!.answer.interaction === 'multi-select')
          expect(question!.answer.correctOptions.length).toBeGreaterThan(1);
        else {
          expect(question!.answer.correctOptions).toHaveLength(1);
          expect(
            question!.options.every((option) =>
              option.startsWith('Minimum level:'),
            ),
          ).toBe(true);
        }
      } else {
        expect(question!.answer.interaction).toBe('single-choice');
        expect(question!.answer.correctOptions).toHaveLength(1);
        expect(
          question!.options.some((option) =>
            option.startsWith('Minimum level:'),
          ),
        ).toBe(false);
      }
    }
  expect(levelFiveInteractions).toEqual(
    new Set(['multi-select', 'single-choice']),
  );
});

it('includes trade and held item as independent Rhyperior requirements', () => {
  const selected = pool.filter(({ name }) =>
    ['rhydon', 'rhyperior'].includes(name),
  );
  const question = build(5, 'rhyperior', selected);
  expect(question?.answer.correctOptions).toHaveLength(2);
  expect(question?.answer.correctOptions).toEqual(
    expect.arrayContaining(['Trade this Pokémon', 'Hold Protector']),
  );
});

it('does not call either alternative method mandatory', () => {
  const selected = pool.filter(({ name }) =>
    ['magneton', 'magnezone'].includes(name),
  );
  const source = {
    ...catalog,
    topics: {
      ...catalog.topics,
      evolutions: evolutionData.values.filter(
        (entry) =>
          entry.before === 'magneton' &&
          entry.after === 'magnezone' &&
          entry.game === 'sun',
      ),
    },
  } as PokemonCatalog;
  expect(build(4, 'alternate-methods', selected, source)).toBeUndefined();
});
