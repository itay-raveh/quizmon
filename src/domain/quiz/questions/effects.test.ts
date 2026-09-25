import abilityData from '../../pokemon/data/topics-abilities-0.json' with { type: 'json' };
import itemData from '../../pokemon/data/topics-items-0.json' with { type: 'json' };
import moreItems from '../../pokemon/data/topics-items-1.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { buildQuestionType } from './registry.ts';

const items = [...itemData.values, ...moreItems.values];
const catalog = {
  contentVersion: 1,
  pokemon: {},
  typeRelations: {},
  topics: { abilities: abilityData.values, items },
} as unknown as PokemonCatalog;

it('builds ability, bag-item, and held-item effects from their own source pools', () => {
  const families = [
    { type: 'ability-effects', levels: [3, 4, 5], kind: undefined },
    { type: 'medicine-cabinet', levels: [1, 2, 3], kind: 'bag' },
    { type: 'held-item-effects', levels: [3, 4, 5], kind: 'held' },
  ] as const;
  for (const { type: questionType, levels, kind } of families)
    for (const difficulty of levels) {
      const question = buildQuestionType(
        {
          catalog,
          difficulty,
          pool: [],
          random: createSeededRandom(`${questionType}:${difficulty}`),
          used: new Set(),
        },
        questionType,
      );
      expect(question, `${questionType} level ${difficulty}`).toBeDefined();
      expect(question!.options).toHaveLength(4);
      expect(new Set(question!.options).size).toBe(4);
      expect(question!.options).toContain(question!.answer.correctOptions[0]);
      if (kind) {
        const source = items.filter((item) => item.effectKind === kind);
        expect(
          source.some((item) => item.name === question!.subject.name),
        ).toBe(true);
        expect(
          question!.options.every((option) =>
            source.some((item) =>
              item.descriptions?.some(
                (entry) =>
                  entry.generation === question!.subject.generation &&
                  (entry.text === option || entry.explanation === option),
              ),
            ),
          ),
        ).toBe(true);
      }
    }
});

it('builds bag-item uses in an older-generation round', () => {
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 1,
      generations: ['I'],
      pool: [],
      random: createSeededRandom('bag-gen-one'),
      used: new Set(),
    },
    'medicine-cabinet',
  );
  expect(question?.subject.generation).toBe('I');
});
