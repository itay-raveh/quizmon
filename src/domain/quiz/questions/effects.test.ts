import abilityData from '../../pokemon/data/topics-abilities-0.json' with { type: 'json' };
import itemData from '../../pokemon/data/topics-items-0.json' with { type: 'json' };
import moreItems from '../../pokemon/data/topics-items-1.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
import { buildQuestionType } from './registry.ts';
import { isQuestionData } from '../lineup.ts';

const items = [...itemData.values, ...moreItems.values];
const catalog = {
  pokemon: {},
  typeRelations: {},
  topics: { abilities: abilityData.values, items },
} as unknown as PokemonCatalog;

it('builds ability, bag-item, and held-item effects from their own source pools', () => {
  const families = [
    { type: 'abilityEffects', levels: [3, 4, 5], kind: undefined },
    { type: 'itemUses', levels: [2, 3, 4, 5], kind: 'bag' },
    { type: 'heldItemEffects', levels: [3, 4, 5], kind: 'held' },
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
      expect(question!.options).toHaveLength(
        questionType === 'abilityEffects' && difficulty === 5 ? 1 : 4,
      );
      expect(new Set(question!.options).size).toBe(question!.options.length);
      expect(question!.options).toContain(question!.answer.correctOptions[0]);
      if (questionType === 'abilityEffects') {
        const answer = question!.answer.correctOptions[0]!;
        expect(answer).toBe(question!.subject.name);
        expect(question!.prompt.kind).toBe('text');
        expect(
          question!.prompt.kind === 'text' && question!.prompt.description,
        ).toBeTruthy();
        expect(question!.answer.interaction).toBe(
          difficulty === 5 ? 'search' : 'single-choice',
        );
        if (difficulty === 5)
          expect(question!.searchOptions!.length).toBeGreaterThan(100);
        expect(isQuestionData(question)).toBe(true);
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

it('searches ability names from an unambiguous short effect at level 5', () => {
  const abilities = catalog.topics!.abilities;
  const target = abilities.find((ability) => ability.name === 'levitate')!;
  const description = target.descriptions!.find(
    (entry) => entry.generation === 'IX',
  )!;
  const question = buildEffectDescription(
    {
      catalog,
      questionType: 'abilityEffects',
      difficulty: 5,
      generations: ['IX'],
      variant: getQuestionVariant('abilityEffects', 5)!.variant,
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
        difficulty: 5,
        generations: ['IX'],
        variant: getQuestionVariant('abilityEffects', 5)!.variant,
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
  const question = buildQuestionType(
    {
      catalog,
      difficulty: 2,
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
        difficulty: 2,
        pool: [],
        random: createSeededRandom('excluded-item-uses'),
        used: new Set(),
      },
      'itemUses',
    ),
  ).toBeUndefined();
});

it('uses self-describing medicine only when its name is hidden', () => {
  const medicine = catalog.topics!.items.filter((item) =>
    [
      'antidote',
      'burn-heal',
      'ice-heal',
      'awakening',
      'paralyze-heal',
    ].includes(item.name),
  );
  const medicineCatalog = {
    ...catalog,
    topics: { ...catalog.topics!, items: medicine },
  };
  const build = (difficulty: 2 | 3 | 4 | 5, items = medicine) =>
    buildQuestionType(
      {
        catalog: {
          ...medicineCatalog,
          topics: { ...medicineCatalog.topics, items },
        },
        difficulty,
        generations: ['IX'],
        pool: [],
        random: createSeededRandom(`named-medicine:${difficulty}`),
        used: new Set(),
      },
      'itemUses',
    );

  expect(medicine).toHaveLength(5);
  expect(build(2)).toBeUndefined();
  expect(build(3)).toBeUndefined();
  for (const difficulty of [4, 5] as const) {
    const question = build(difficulty);
    expect(question).toBeDefined();
    expect(medicine.some((item) => item.name === question!.subject.name)).toBe(
      true,
    );
    expect(question!.rendering!.subject.name).toBe('after-answer');
    expect(
      build(
        difficulty,
        medicine.map((item) => ({ ...item, sprite: null })),
      ),
    ).toBeUndefined();
  }
});

it('narrows Item uses distractors at each level', () => {
  const bagItems = catalog.topics!.items.filter(
    (item) => item.effectKind === 'bag',
  );
  const target = bagItems.find((item) => item.name === 'rare-candy')!;
  const build = (item: typeof target, difficulty: 2 | 3 | 4 | 5) =>
    buildEffectDescription(
      {
        catalog,
        questionType: 'itemUses',
        difficulty,
        generations: ['IX'],
        variant: getQuestionVariant('itemUses', difficulty)!.variant,
        pool: [],
        random: createSeededRandom('item-distractors'),
        used: new Set(),
      },
      item,
      'item',
      bagItems,
    );
  const choices = ([2, 3, 4, 5] as const).map((difficulty) => {
    const question = build(target, difficulty)!;
    return question.options.filter(
      (option) => option !== question.answer.correctOptions[0],
    );
  });
  const sources = (options: string[]) =>
    options.map((option) =>
      bagItems.find((item) =>
        item.descriptions?.some((entry) => entry.text === option),
      )!,
    );
  expect(sources(choices[0]!).some((item) => item.pocket !== 'medicine')).toBe(
    true,
  );
  for (const level of [1, 2, 3] as const)
    expect(
      sources(choices[level]!).every((item) => item.category === 'vitamins'),
    ).toBe(true);
  const masterBall = bagItems.find((item) => item.name === 'master-ball')!;
  expect(build(masterBall, 3)).toBeDefined();
  expect(build(masterBall, 4)).toBeUndefined();
  const luxuryBall = bagItems.find((item) => item.name === 'luxury-ball')!;
  expect(build(luxuryBall, 4)).toBeDefined();
  expect(build(luxuryBall, 5)).toBeUndefined();
});

it('keeps held Berry distractors among Berries', () => {
  const heldItems = catalog.topics!.items.filter(
    (item) => item.effectKind === 'held',
  );
  const target = heldItems.find((item) => item.name === 'cheri-berry')!;
  const question = buildEffectDescription(
    {
      catalog,
      questionType: 'heldItemEffects',
      difficulty: 3,
      generations: ['IX'],
      variant: getQuestionVariant('heldItemEffects', 3)!.variant,
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
  const bagItems = catalog.topics!.items.filter(
    (item) => item.effectKind === 'bag',
  );
  const target = bagItems.find((item) => item.name === 'rare-candy')!;
  const variant = {
    ...getQuestionVariant('itemUses', 2)!.variant,
    maximumEffectSimilarity: 0,
  };
  expect(
    buildEffectDescription(
      {
        catalog,
        questionType: 'itemUses',
        difficulty: 2,
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
