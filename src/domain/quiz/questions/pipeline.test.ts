import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { TopicCatalog } from '../topic-catalog.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { savedQuestionSchema } from '../lineup.ts';
import { buildLeagueQuestions } from '../question-generation.ts';
import { leagueStages } from '../league.ts';
import { gameLevels } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';
import type { QuestionData } from '../types.ts';
import { defaultGameSettings } from '../../settings/game-settings.ts';
import { questionRules } from '../question-rules/registry.ts';
import { buildQuestionType } from './registry.ts';
import {
  assembleQuestion,
  hasVisibleChoices,
  hasVisibleSubject,
} from './rendering-pipeline.ts';
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
it('builds five League levels with distinct formats and a Champion finale', () => {
  const questions = buildLeagueQuestions(
    catalog,
    'league-levels',
    defaultGameSettings,
  );
  expect(questions).toHaveLength(leagueStages.length * 3);
  expect(new Set(questions.map(({ questionType }) => questionType)).size).toBe(
    questions.length,
  );
  expect(questions.at(-1)?.questionType).toBe('champion');
  expect(questions.at(-1)?.variantLevel).toBe(5);
}, 30_000);

it('builds every configured family with a visible saved question', () => {
  for (const type of Object.keys(questionRules) as (
    QuestionType | 'champion'
  )[]) {
    const levels = gameLevels.filter((level) =>
      getQuestionVariant(type, level),
    );
    for (const level of levels) {
      const question = Array.from({ length: 5 }, (_, attempt) =>
        buildQuestionType(
          {
            catalog,
            pool,
            random: createSeededRandom(`${type}:${level}:${attempt}`),
            used: new Set(),
            level,
          },
          type,
        ),
      ).find(Boolean);
      expect(question, `${type}:${level}`).toBeDefined();
      const saved = savedQuestionSchema.parse(question);
      expect(hasVisibleChoices(saved), `${type}:${level}`).toBe(true);
      expect(hasVisibleSubject(saved), `${type}:${level}`).toBe(true);
    }
  }
});

it('rejects image-only choices when a catalog sprite is missing', () => {
  const level = gameLevels.find((level) =>
    getQuestionVariant('spriteForPokemon', level),
  )!;
  const question = buildQuestionType(
    {
      catalog,
      pool,
      random: createSeededRandom('sprite-only-choice'),
      used: new Set(),
      level,
    },
    'spriteForPokemon',
  )!;
  const choices = {
    ...question.rendering!.choices,
    name: 'never' as const,
    number: 'never' as const,
    types: 'never' as const,
  };
  expect(
    hasVisibleChoices({
      ...question,
      rendering: { ...question.rendering!, choices },
    }),
  ).toBe(true);
  expect(
    hasVisibleSubject({
      ...question,
      rendering: {
        ...question.rendering!,
        subject: {
          ...question.rendering!.subject,
          name: 'never',
          number: 'never',
          types: 'never',
          sprite: null,
        },
      },
    }),
  ).toBe(false);
  expect(
    hasVisibleChoices({
      ...question,
      optionVisuals: Object.fromEntries(
        Object.entries(question.optionVisuals ?? {}).map(([name, visual]) => [
          name,
          { ...visual, src: null },
        ]),
      ),
      rendering: { ...question.rendering!, choices },
    }),
  ).toBe(false);
});

it('uses the configured source for choice sprites', () => {
  const [name, pokemon] = Object.entries(catalog.pokemon).find(
    ([, value]) =>
      value.sprite &&
      value.identitySprites.generations.some(({ back }) => back.length),
  )!;
  const back = pokemon.identitySprites.generations.flatMap(
    ({ back }) => back,
  )[0]!;
  const sprites = [
    pokemon.sprite,
    ...pokemon.identitySprites.generations.flatMap(({ front, back }) => [
      ...front,
      ...back,
    ]),
  ].filter(Boolean);
  const backIndex = sprites.indexOf(back);
  const spriteLevel = gameLevels.find((level) =>
    getQuestionVariant('spriteForPokemon', level),
  )!;
  const rules = getQuestionVariant('spriteForPokemon', spriteLevel)!.variant;
  const allSources = {
    ...rules,
    rendering: {
      ...rules.rendering,
      choices: {
        ...rules.rendering.choices,
        sprite: { reveal: 'always', silhouette: false, source: 'all' },
      },
    },
  } as const;
  const question: Omit<QuestionData, 'questionType'> = {
    answer: { interaction: 'single-choice', correctOptions: [name] },
    category: 'identity',
    id: name,
    media: { kind: 'none' },
    options: [name],
    prompt: { kind: 'text', text: 'Choose one.' },
    repetition: {
      identity: name,
      subjects: [name],
      primary: [name],
      distractors: [],
    },
    subject: {
      kind: 'pokemon',
      name,
      generation: pokemon.generation,
      types: pokemon.types,
    },
  };
  const result = assembleQuestion(
    question,
    {
      catalog,
      pool,
      random: () => (backIndex + 0.1) / sprites.length,
      used: new Set(),
    },
    allSources,
  );
  expect(result.optionVisuals?.[name]?.src).toBe(back);
  expect(result.optionVisuals?.[name]?.src).not.toBe(pokemon.sprite);

  const searchLevel = gameLevels.find(
    (level) =>
      getQuestionVariant('pokedexEntryMatch', level)?.variant.response.kind ===
      'search',
  )!;
  const searchRules = getQuestionVariant(
    'pokedexEntryMatch',
    searchLevel,
  )!.variant;
  const searchWithHistoricalSubject = {
    ...searchRules,
    rendering: {
      ...searchRules.rendering,
      subject: {
        ...searchRules.rendering.subject,
        sprite: { reveal: 'after-answer', silhouette: false, source: 'all' },
      },
    },
  } as const;
  const search = assembleQuestion(
    question,
    {
      catalog,
      pool,
      random: () => (backIndex + 0.1) / sprites.length,
      used: new Set(),
    },
    searchWithHistoricalSubject,
  );
  expect(search.media).toEqual({ kind: 'pixel-sprite', src: back });
  expect(
    search.searchOptions?.find((option) => option.name === name)?.sprite,
  ).toBe(pokemon.sprite);
});
