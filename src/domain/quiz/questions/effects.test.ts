import abilityData from '../../pokemon/data/topics-abilities-0.json' with { type: 'json' };
import itemData from '../../pokemon/data/topics-items-0.json' with { type: 'json' };
import moreItems from '../../pokemon/data/topics-items-1.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { difficultyLevels } from '../difficulty.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
import { buildQuestionType } from './registry.ts';

const items = [...itemData.values, ...moreItems.values];
const catalog = {
  pokemon: {},
  typeRelations: {},
  topics: { abilities: abilityData.values, items },
} as unknown as PokemonCatalog;

it('builds ability, bag-item, and held-item effects from their own source pools', () => {
  const families = [
    { type: 'abilityEffects', kind: undefined },
    { type: 'itemUses', kind: 'bag' },
    { type: 'heldItemEffects', kind: 'held' },
  ] as const;
  for (const { type: questionType, kind } of families)
    for (const difficulty of difficultyLevels.filter((level) =>
      getQuestionVariant(questionType, level),
    )) {
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
      expect(new Set(question!.options).size).toBe(question!.options.length);
      expect(question!.options).toContain(question!.answer.correctOptions[0]);
      if (questionType === 'abilityEffects') {
        const answer = question!.answer.correctOptions[0]!;
        expect(answer).toBe(question!.subject.name);
        expect(question!.prompt.kind).toBe('text');
        expect(
          question!.prompt.kind === 'text' && question!.prompt.description,
        ).toBeTruthy();
        if (question!.answer.interaction === 'search')
          expect(
            question!.searchOptions?.some(({ name }) => name === answer),
          ).toBe(true);
      }
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

it('searches ability names from an unambiguous short effect', () => {
  const difficulty = difficultyLevels.find(
    (level) =>
      getQuestionVariant('abilityEffects', level)?.variant.response.kind ===
      'search',
  )!;
  const abilities = catalog.topics!.abilities;
  const target = abilities.find((ability) => ability.name === 'levitate')!;
  const description = target.descriptions!.find(
    (entry) => entry.generation === 'IX',
  )!;
  const question = buildEffectDescription(
    {
      catalog,
      questionType: 'abilityEffects',
      difficulty,
      generations: ['IX'],
      variant: getQuestionVariant('abilityEffects', difficulty)!.variant,
      pool: [],
      random: createSeededRandom('short-ability-effects'),
      used: new Set(),
    },
    target,
    'ability',
    abilities,
  )!;

  expect(question.options).toEqual([target.name]);
  expect(question.prompt.kind === 'text' && question.prompt.description).toBe(
    description.text,
  );
  expect(question.searchOptions).toContainEqual({ name: 'levitate' });
  expect(question.searchOptions!.length).toBeGreaterThan(100);
  expect(question.explanation).toBe(description.text);
  expect(
    buildEffectDescription(
      {
        catalog,
        questionType: 'abilityEffects',
        difficulty,
        generations: ['IX'],
        variant: getQuestionVariant('abilityEffects', difficulty)!.variant,
        pool: [],
        random: createSeededRandom('duplicate-ability-effect'),
        used: new Set(),
      },
      abilities.find((ability) => ability.name === 'mold-breaker')!,
      'ability',
      abilities,
    ),
  ).toBeUndefined();
});

it('builds bag-item uses in an older-generation round', () => {
  const difficulty = difficultyLevels.find((level) =>
    getQuestionVariant('itemUses', level),
  )!;
  const question = buildQuestionType(
    {
      catalog,
      difficulty,
      generations: ['I'],
      pool: [],
      random: createSeededRandom('bag-gen-one'),
      used: new Set(),
    },
    'itemUses',
  );
  expect(question?.subject.generation).toBe('I');
});

it('excludes Data Cards and Mega accessories from Item uses', () => {
  const difficulty = difficultyLevels.find((level) =>
    getQuestionVariant('itemUses', level),
  )!;
  const excluded = catalog.topics!.items.filter(
    (item) =>
      item.category === 'data-cards' ||
      item.name === 'key-stone' ||
      item.name.startsWith('mega-'),
  );
  expect(excluded.some((item) => item.category === 'data-cards')).toBe(true);
  expect(excluded.some((item) => item.name === 'mega-ring')).toBe(true);
  expect(
    buildQuestionType(
      {
        catalog: {
          ...catalog,
          topics: { ...catalog.topics!, items: excluded },
        },
        difficulty,
        pool: [],
        random: createSeededRandom('excluded-item-uses'),
        used: new Set(),
      },
      'itemUses',
    ),
  ).toBeUndefined();
});

it('keeps held Berry distractors among Berries', () => {
  const difficulty = difficultyLevels.find((level) =>
    getQuestionVariant('heldItemEffects', level),
  )!;
  const heldItems = catalog.topics!.items.filter(
    (item) => item.effectKind === 'held',
  );
  const target = heldItems.find((item) => item.name === 'cheri-berry')!;
  const question = buildEffectDescription(
    {
      catalog,
      questionType: 'heldItemEffects',
      difficulty,
      generations: ['IX'],
      variant: getQuestionVariant('heldItemEffects', difficulty)!.variant,
      pool: [],
      random: createSeededRandom('held-berries'),
      used: new Set(),
    },
    target,
    'item',
    heldItems,
  )!;
  expect(
    question.options.every((option) =>
      heldItems.some(
        (item) =>
          item.pocket === 'berries' &&
          item.descriptions?.some((entry) => entry.text === option),
      ),
    ),
  ).toBe(true);
});

it('respects a raw effect similarity limit', () => {
  const difficulty = difficultyLevels.find((level) =>
    getQuestionVariant('itemUses', level),
  )!;
  const bagItems = catalog.topics!.items.filter(
    (item) => item.effectKind === 'bag',
  );
  const target = bagItems.find((item) => item.name === 'rare-candy')!;
  const variant = {
    ...getQuestionVariant('itemUses', difficulty)!.variant,
    maximumEffectSimilarity: 0,
  };
  expect(
    buildEffectDescription(
      {
        catalog,
        questionType: 'itemUses',
        difficulty,
        generations: ['IX'],
        variant,
        pool: [],
        random: createSeededRandom('raw-effect-limit'),
        used: new Set(),
      },
      target,
      'item',
      bagItems,
    ),
  ).toBeUndefined();
});
