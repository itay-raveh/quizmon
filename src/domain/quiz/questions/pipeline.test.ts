import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import type { TopicCatalog } from '../topic-catalog.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { savedQuestionSchema } from '../lineup.ts';
import { getQuestionView } from '../presentation.ts';
import { questionRenderingSchema } from '../rendering.ts';
import { getQuestionVariant, getUnleveledQuestionRule } from '../variants.ts';
import type { QuestionData } from '../types.ts';
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
const answerDomains = {
  pokemon: new Set(Object.keys(catalog.pokemon)),
  type: new Set(Object.keys(catalog.typeRelations)),
  item: new Set(catalog.topics!.items.map(({ name }) => name)),
  move: new Set(catalog.topics!.moves.map(({ name }) => name)),
  ability: new Set(catalog.topics!.abilities.map(({ name }) => name)),
  region: new Set(catalog.topics!.regions.map(({ name }) => name)),
  nature: new Set(catalog.topics!.natures.map(({ name }) => name)),
};
const familyDomains = {
  itemIdentification: ['item', 'item'],
  itemUses: ['item', null],
  weightComparison: ['pokemon', 'pokemon'],
  heightComparison: ['pokemon', 'pokemon'],
  moveTypes: ['move', 'type'],
  locationRegion: ['location', 'region'],
  moveCategory: ['move', 'move'],
  pokedexCategories: ['pokemon', 'pokemon'],
  evolutionConditions: ['pokemon', null],
  abilityEffects: ['ability', 'ability'],
  heldItemEffects: ['item', null],
  hiddenAbilities: ['pokemon', 'ability'],
  natureEffects: ['nature', 'nature'],
  evYields: ['pokemon', null],
  encounterLocations: ['location', 'pokemon'],
  berryFlavors: ['berry', null],
  naturalGift: ['berry', 'type'],
  pokemonFromHistoricalSprite: ['pokemon', 'pokemon'],
  spriteForPokemon: ['pokemon', 'pokemon'],
  silhouetteForPokemon: ['pokemon', 'pokemon'],
  pokemonFromSilhouette: ['pokemon', 'pokemon'],
  pokemonFromPixelCrop: ['pokemon', 'pokemon'],
  shinyPokemonIdentification: ['pokemon', 'pokemon'],
  pokedexEntryMatch: ['pokemon', 'pokemon'],
  pokemonTypes: ['pokemon', 'type'],
  typeOddOneOut: ['pokemon', 'pokemon'],
  pokemonByType: ['pokemon', 'pokemon'],
  dualTypeMatch: ['pokemon', 'pokemon'],
  legendaryMythicalSelection: ['pokemon', 'pokemon'],
  pokemonByGeneration: ['pokemon', 'pokemon'],
  evolutionChain: ['pokemon', 'pokemon'],
  evolutionGainedType: ['pokemon', 'type'],
  pokemonAbilities: ['pokemon', 'ability'],
  levelUpMoves: ['pokemon', 'move'],
  statExtremes: ['pokemon', 'pokemon'],
  typeMatchup: ['pokemon', 'type'],
  superEffectiveAttacker: ['pokemon', 'pokemon'],
  champion: ['pokemon', 'pokemon'],
} as const satisfies Record<
  QuestionType | 'champion',
  readonly [QuestionData['subject']['kind'], keyof typeof answerDomains | null]
>;

it('builds every configured family with a renderable answer and saved view', () => {
  for (const type of Object.keys(questionRules) as (
    QuestionType | 'champion'
  )[]) {
    const row = questionRules[type];
    const levels = ([1, 2, 3, 4, 5] as const).filter((level) =>
      getQuestionVariant(type, level),
    );
    for (const difficulty of [
      ...levels,
      ...('unleveled' in row ? [undefined] : []),
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
      const [subjectKind, answerDomain] = familyDomains[type];
      expect(question!.subject.kind, `${type}:${difficulty}`).toBe(subjectKind);
      if (answerDomain)
        expect(
          question!.options.every((option) =>
            answerDomains[answerDomain].has(option),
          ),
          `${type}:${difficulty}`,
        ).toBe(true);
      const response =
        difficulty === undefined
          ? getUnleveledQuestionRule(type)?.response
          : getQuestionVariant(type, difficulty)?.variant.response;
      if (response?.kind === 'picker' && response.selection !== 'adaptive')
        expect(question!.answer.interaction, `${type}:${difficulty}`).toBe(
          response.selection === 'single' ? 'single-choice' : 'multi-select',
        );
      if (response?.kind === 'search' && response.selection === 'multi')
        expect(question!.answer.interaction, `${type}:${difficulty}`).toBe(
          'multi-select',
        );
      const saved = savedQuestionSchema.parse(question);
      expect(questionRenderingSchema.safeParse(saved.rendering).success).toBe(
        true,
      );
      expect(hasVisibleChoices(saved), `${type}:${difficulty}`).toBe(true);
      expect(hasVisibleSubject(saved), `${type}:${difficulty}`).toBe(true);
      const view = getQuestionView(saved);
      expect(view, `${type}:${difficulty}`).toEqual(question!.view);
      if (question!.optionImages) expect(view.answer.kind, type).toBe('item');
      else if (question!.optionVisuals)
        expect(view.answer.kind, type).toBe('pokemon');
      if (question!.answer.interaction === 'search' && type !== 'champion')
        expect(question!.optionVisuals).toBeUndefined();
      if (
        view.answer.kind === 'pokemon' &&
        question!.answer.interaction !== 'search'
      )
        for (const option of question!.options.filter(
          (name) => catalog.pokemon[name],
        ))
          expect(
            question!.optionVisuals?.[option],
            `${type}:${option}`,
          ).toBeDefined();
    }
  }
});

it('rejects image-only choices when a catalog sprite is missing', () => {
  const question = buildQuestionType(
    {
      catalog,
      pool,
      random: createSeededRandom('sprite-only-choice'),
      used: new Set(),
      difficulty: 1,
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
  const rules = getQuestionVariant('spriteForPokemon', 1)!.variant;
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

  const searchRules = getQuestionVariant('pokedexEntryMatch', 4)!.variant;
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
