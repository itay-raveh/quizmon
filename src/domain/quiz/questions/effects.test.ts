import abilityData from '../../pokemon/data/topics-abilities-0.json' with { type: 'json' };
import itemData from '../../pokemon/data/topics-items-0.json' with { type: 'json' };
import moreItems from '../../pokemon/data/topics-items-1.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { getQuestionVariant } from '../question-variants.ts';
import { buildEffectDescription } from './effect-descriptions.ts';
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
    { type: 'medicine-cabinet', levels: [2, 3, 4, 5], kind: 'bag' },
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

it('uses short Ability effects choices at level 5', () => {
  const abilities = catalog.topics!.abilities;
  const target = abilities.find((ability) => ability.name === 'mold-breaker')!;
  const description = target.descriptions!.find(
    (entry) => entry.generation === 'IX',
  )!;
  const question = buildEffectDescription(
    {
      catalog,
      questionType: 'ability-effects',
      difficulty: 5,
      generations: ['IX'],
      variant: getQuestionVariant('ability-effects', 5)!.variant,
      pool: [],
      random: createSeededRandom('short-ability-effects'),
      used: new Set(),
    },
    target,
    'ability',
    abilities,
  )!;

  expect(question.options).toContain(description.text);
  expect(question.options).not.toContain(description.explanation);
  expect(
    question.options.every((option) =>
      abilities.some((ability) =>
        ability.descriptions?.some(
          (entry) => entry.generation === 'IX' && entry.text === option,
        ),
      ),
    ),
  ).toBe(true);
  expect(question.explanation).toBe(description.text);
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
    'medicine-cabinet',
  );
  expect(question?.subject.generation).toBe('I');
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
        questionType: 'medicine-cabinet',
        difficulty,
        generations: ['IX'],
        variant: getQuestionVariant('medicine-cabinet', difficulty)!.variant,
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
      questionType: 'held-item-effects',
      difficulty: 3,
      generations: ['IX'],
      variant: getQuestionVariant('held-item-effects', 3)!.variant,
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
    ...getQuestionVariant('medicine-cabinet', 2)!.variant,
    maximumEffectSimilarity: 0,
  };
  expect(
    buildEffectDescription(
      {
        catalog,
        questionType: 'medicine-cabinet',
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
