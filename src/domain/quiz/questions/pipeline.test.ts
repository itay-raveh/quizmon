import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { TopicCatalog } from '../topic-catalog.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { savedQuestionSchema } from '../question-lineup.ts';
import { getQuestionView } from '../question-presentation.ts';
import { questionRules } from '../../../question-rules.ts';
import { buildQuestionType } from './registry.ts';
import type { QuestionType } from './definitions.ts';

const dataDir = fileURLToPath(new URL('../../pokemon/data/', import.meta.url));
const topics: Record<string, unknown> = {};
for (const file of readdirSync(dataDir).filter((name) =>
  name.startsWith('topics-'),
)) {
  const chunk = JSON.parse(readFileSync(`${dataDir}/${file}`, 'utf8')) as {
    key: string;
    values: unknown;
  };
  if (Array.isArray(chunk.values)) {
    topics[chunk.key] = [
      ...((topics[chunk.key] as unknown[]) ?? []),
      ...(chunk.values as unknown[]),
    ];
  } else {
    topics[chunk.key] = {
      ...(topics[chunk.key] ?? {}),
      ...(chunk.values as object),
    };
  }
}
const catalog = {
  ...pokemonData,
  topics: topics as unknown as TopicCatalog,
} as unknown as PokemonCatalog;
const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
  name,
  pokemon,
}));

it('builds every configured family with a renderable answer and saved view', () => {
  for (const type of Object.keys(questionRules) as (
    QuestionType | 'champion'
  )[]) {
    const row = questionRules[type];
    const levels = Object.keys(row.levels).map(Number) as (1 | 2 | 3 | 4 | 5)[];
    for (const difficulty of [
      ...levels,
      ...('standard' in row ? [undefined] : []),
    ]) {
      const question = Array.from({ length: 5 }, (_, attempt) =>
        buildQuestionType(
          {
            catalog,
            pool,
            random: createSeededRandom(`${type}:${difficulty}:${attempt}`),
            used: new Set(),
            ...(difficulty === undefined ? {} : { difficulty }),
          },
          type,
        ),
      ).find(Boolean);
      expect(question, `${type}:${difficulty}`).toBeDefined();
      const saved = savedQuestionSchema.parse(question);
      const view = getQuestionView(saved);
      expect(view, `${type}:${difficulty}`).toEqual(question!.view);
      if (question!.optionImages) expect(view.answer.kind, type).toBe('item');
      else if (question!.optionVisuals)
        expect(view.answer.kind, type).toBe('pokemon');
    }
  }
});
