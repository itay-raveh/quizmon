import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { TopicCatalog } from '../topic-catalog.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { spriteState } from '../rendering.ts';
import { savedQuestionSchema } from '../lineup.ts';
import {
  buildDailyQuestions,
  buildLeagueQuestions,
} from '../question-generation.ts';
import { leagueStages } from '../league.ts';
import { gameLevels } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';
import type { QuestionData } from '../types.ts';
import {
  defaultGameSettings,
  getTrainingSettings,
  getChallengeSettings,
} from '../../settings/game-settings.ts';
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
    getQuestionVariant('pokemonMatch', level),
  )!;
  const question = buildQuestionType(
    {
      catalog,
      pool,
      random: createSeededRandom('sprite-only-choice'),
      used: new Set(),
      level,
    },
    'pokemonMatch',
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

it('selects role sprites independently without changing answers', () => {
  const [name, pokemon] = Object.entries(catalog.pokemon).find(
    ([, value]) =>
      value.sprite &&
      value.identitySprites.generations.some(({ back }) => back.length),
  )!;
  const back = pokemon.identitySprites.generations.find(
    ({ back }) => back.length,
  )!.back[0]!;
  const testPokemon = {
    ...pokemon,
    identitySprites: {
      generations: [
        { generation: pokemon.generation, front: [], back: [back] },
      ],
    },
  };
  const testCatalog = {
    ...catalog,
    pokemon: { ...catalog.pokemon, [name]: testPokemon },
  };
  const spriteLevel = gameLevels.find((level) =>
    getQuestionVariant('pokemonMatch', level),
  )!;
  const rules = getQuestionVariant('pokemonMatch', spriteLevel)!.variant;
  const allSources = {
    ...rules,
    rendering: {
      ...rules.rendering,
      related: {
        ...rules.rendering.related,
        sprite: {
          reveal: 'after-answer',
          silhouette: false,
          historicalSpriteChance: 0,
          backSpriteChance: 0,
        },
      },
      choices: {
        ...rules.rendering.choices,
        sprite: {
          reveal: 'always',
          silhouette: false,
          historicalSpriteChance: 1,
          backSpriteChance: 1,
        },
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
      catalog: testCatalog,
      pool,
      random: () => 0,
      used: new Set(),
    },
    allSources,
  );
  expect(result.optionVisuals?.[name]?.src).toBe(back);
  expect(result.optionVisuals?.[name]?.src).not.toBe(pokemon.sprite);
  expect(result.relatedVisuals?.[name]?.src).toBe(pokemon.sprite);
  expect(result.answer).toEqual(question.answer);

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
      search: {
        ...searchRules.rendering.search,
        sprite: {
          reveal: 'always',
          silhouette: false,
          historicalSpriteChance: 0,
          backSpriteChance: 0,
        },
      },
      subject: {
        ...searchRules.rendering.subject,
        sprite: {
          reveal: 'after-answer',
          silhouette: false,
          historicalSpriteChance: 1,
          backSpriteChance: 1,
        },
      },
    },
  } as const;
  const search = assembleQuestion(
    question,
    {
      catalog: testCatalog,
      pool,
      random: () => 0,
      used: new Set(),
    },
    searchWithHistoricalSubject,
  );
  expect(search.media).toEqual({ kind: 'pixel-sprite', src: back });
  expect(
    search.searchOptions?.find((option) => option.name === name)?.sprite,
  ).toBe(pokemon.sprite);
});

it('keeps seeded Daily and League generation stable within the current rules', () => {
  const settings = getTrainingSettings({
    ...getChallengeSettings(defaultGameSettings),
    level: 3,
  });
  expect(buildDailyQuestions(catalog, '2026-10-09', settings)).toEqual(
    buildDailyQuestions(catalog, '2026-10-09', settings),
  );
  expect(
    buildLeagueQuestions(catalog, 'sprite-seed', defaultGameSettings),
  ).toEqual(buildLeagueQuestions(catalog, 'sprite-seed', defaultGameSettings));
});

it('gives a fixed Pokémon progressively tighter Pixel Peek crops without switching artwork', () => {
  const levels = [3, 4, 5] as const;
  const generated = levels.map((level) =>
    buildQuestionType(
      {
        catalog,
        pool,
        random: createSeededRandom('pixel-zoom'),
        used: new Set(),
        level,
      },
      'pokemonFromPixelCrop',
    )!,
  );
  const media = generated.map(({ media }) => {
    if (media.kind !== 'pokemonFromPixelCrop') throw new Error('Missing crop');
    return media;
  });
  expect(new Set(generated.map(({ subject }) => subject.name)).size).toBe(1);
  expect(new Set(media.map(({ src }) => src)).size).toBe(1);
  expect(media[0]!.zoom).toBeLessThan(media[1]!.zoom!);
  expect(media[1]!.zoom).toBeLessThan(media[2]!.zoom!);
});

it('conceals all matching choices together and reveals them after answering without resampling saved questions', () => {
  const rules = getQuestionVariant('pokemonMatch', 1)!.variant;
  const draft = buildQuestionType(
    {
      catalog,
      pool,
      random: createSeededRandom('concealment'),
      used: new Set(),
      level: 1,
    },
    'pokemonMatch',
  )!;
  const generate = (roll: number) =>
    assembleQuestion(
      draft,
      { catalog, pool, random: () => roll, used: new Set() },
      rules,
    );
  const concealed = generate(0);
  const visible = generate(0.99);
  expect(concealed.answer).toEqual(visible.answer);
  expect(concealed.options).toEqual(visible.options);
  expect(
    concealed.options.every((option) => concealed.optionVisuals?.[option]?.src),
  ).toBe(true);
  expect(
    spriteState(concealed.rendering!.choices.sprite, {
      answered: false,
      cluesShown: 0,
    }).silhouette,
  ).toBe(true);
  expect(
    spriteState(visible.rendering!.choices.sprite, {
      answered: false,
      cluesShown: 0,
    }).silhouette,
  ).toBe(false);
  expect(
    spriteState(concealed.rendering!.choices.sprite, {
      answered: true,
      cluesShown: 0,
    }).silhouette,
  ).toBe(false);
  expect(savedQuestionSchema.parse(concealed).rendering).toEqual(
    concealed.rendering,
  );
  expect(generate(0)).toEqual(concealed);
});
