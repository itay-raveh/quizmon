import abilityData from '../../pokemon/data/topics-abilities-0.json' with { type: 'json' };
import itemData from '../../pokemon/data/topics-items-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { buildQuestionType } from './registry.ts';

const catalog = {
  contentVersion: 1,
  pokemon: {},
  typeRelations: {},
  topics: { abilities: abilityData.values, items: itemData.values },
} as unknown as PokemonCatalog;

it('builds ability and held-item effects at every authored difficulty from packaged descriptions', () => {
  for (const questionType of ['ability-effects', 'held-item-effects'] as const)
    for (const difficulty of [3, 4, 5] as const) {
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
    }
});
