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

it('renders a generated comparison’s subject and choices from one shared actual game set', () => {
  const eligible = pool.filter(({ pokemon }) =>
    ['I', 'II'].includes(pokemon.generation),
  );
  const original = buildQuestionType(
    {
      catalog,
      pool: eligible,
      level: 3,
      used: new Set(),
      random: createSeededRandom('shared-comparison'),
    },
    'dualTypeMatch',
  )!;
  const rules = getQuestionVariant('dualTypeMatch', 3)!.variant;
  const historical = {
    ...rules,
    rendering: {
      ...rules.rendering,
      subject: {
        ...rules.rendering.subject,
        sprite: {
          reveal: 'always',
          silhouette: false,
          historicalSpriteChance: 0.5,
        },
      },
      choices: {
        ...rules.rendering.choices,
        sprite: {
          reveal: 'always',
          silhouette: false,
          historicalSpriteChance: 0.5,
        },
      },
    },
  } as const;
  const render = (source: PokemonCatalog) => {
    let rolls = 0;
    return assembleQuestion(
      {
        ...original,
        optionVisuals: undefined,
        media: {
          kind: 'pixel-sprite',
          src: source.pokemon[original.subject.name]!.sprite!,
        },
      },
      {
        catalog: source,
        pool: eligible,
        used: new Set(),
        random: () => (rolls++ === 0 ? 0.2 : 0.8),
      },
      historical,
    );
  };
  const result = render(catalog);
  const sources = [
    result.media.kind === 'pixel-sprite' ? result.media.src : '',
    ...result.options.map((name) => result.optionVisuals![name]!.src!),
  ];
  expect(sources.every((src) => src.includes('/versions/'))).toBe(true);
  expect(
    new Set(
      sources.map(
        (src) => src.match(/versions\/(generation-[^/]+\/[^/]+)\//)?.[1],
      ),
    ).size,
  ).toBe(1);
  for (const [index, name] of [
    original.subject.name,
    ...original.options,
  ].entries()) {
    const assets = catalog.pokemon[name]!.identitySprites.generations.flatMap(
      (era) => [...era.front, ...era.back],
    );
    expect(assets).toContain(sources[index]);
  }
  expect(result.answer).toEqual(original.answer);
  expect(render(catalog)).toEqual(result);
  const missing = original.options[0]!;
  const unavailable = {
    ...catalog,
    pokemon: {
      ...catalog.pokemon,
      [missing]: {
        ...catalog.pokemon[missing]!,
        identitySprites: { currentBack: null, generations: [] },
      },
    },
  };
  const fallback = render(unavailable);
  expect(fallback.media).toEqual({
    kind: 'pixel-sprite',
    src: catalog.pokemon[original.subject.name]!.sprite,
  });
  for (const name of fallback.options)
    expect(fallback.optionVisuals![name]!.src).toBe(
      catalog.pokemon[name]!.sprite,
    );
  expect(fallback.answer).toEqual(original.answer);
});

it('renders generated current-mode Pokémon choices from their actual form backs', () => {
  const original = buildQuestionType(
    {
      catalog,
      pool,
      level: 3,
      used: new Set(),
      random: createSeededRandom('current-form-backs'),
    },
    'pokemonMatch',
  )!;
  const rules = getQuestionVariant('pokemonMatch', 3)!.variant;
  const current = {
    ...rules,
    rendering: {
      ...rules.rendering,
      choices: {
        ...rules.rendering.choices,
        sprite: {
          reveal: 'always',
          silhouette: false,
          historicalSpriteChance: 0,
          backSpriteChance: 1,
        },
      },
    },
  } as const;
  const result = assembleQuestion(
    { ...original, optionVisuals: undefined },
    {
      catalog,
      pool,
      used: new Set(),
      random: createSeededRandom('render-current-backs'),
    },
    current,
  );
  for (const name of result.options) {
    const pokemon = catalog.pokemon[name]!;
    expect(result.optionVisuals![name]!.src).toBe(
      pokemon.identitySprites.currentBack ?? pokemon.sprite,
    );
    expect(result.optionVisuals![name]!.src).not.toContain('/versions/');
  }
  expect(result.answer).toEqual(original.answer);
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
