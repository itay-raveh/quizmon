import {
  catalog,
  createQuestionContext,
} from '../../../../tests/fixtures/catalog';
import { buildAbilityDescription } from './ability-descriptions';
import { presentEffectQuestion } from './effect-presentation';
import { buildQuestionType } from './registry';

it('generates sourced choices for every ability with an imported description', () => {
  const abilities = catalog.topics!.abilities;
  for (const ability of abilities.filter(
    (entry) => entry.descriptions?.length,
  )) {
    const question = buildAbilityDescription(
      createQuestionContext(ability.name),
      ability,
    );
    expect(question, ability.name).toBeDefined();
    const generated = question!;
    expect(new Set(generated.options).size, ability.name).toBe(4);
    const correct = generated.answer.correctOptions[0];
    expect(ability.descriptions!.some((entry) => entry.text === correct)).toBe(
      true,
    );
  }
  expect(catalog.topics!.gaps.abilityDescription).toEqual(
    abilities
      .filter((entry) => !entry.descriptions?.length)
      .map((entry) => entry.name),
  );
});

it('supports an ability outside the authored scenarios at every supported level', () => {
  const context = createQuestionContext('automatic-ability');
  const abilities = catalog.topics!.abilities;
  const target = abilities.find((ability) => ability.name === 'drizzle')!;
  for (const difficulty of [3, 4, 5] as const) {
    const question = buildQuestionType(
      {
        ...context,
        difficulty,
        catalog: {
          ...catalog,
          topics: {
            ...catalog.topics!,
            effects: [],
            abilities: abilities.map((ability) => ({
              ...ability,
              generations: ability === target ? ability.generations : [],
            })),
          },
        },
      },
      'ability-effects',
    );
    expect(question?.subject.name).toBe('drizzle');
    expect(presentEffectQuestion(question!, catalog.topics!.effects)).toBe(
      question,
    );
  }
});

it('skips missing descriptions, unavailable games, and equivalent choices', () => {
  const context = createQuestionContext('ambiguous-abilities');
  const target = catalog.topics!.abilities.find(
    (ability) => ability.name === 'huge-power',
  )!;
  expect(
    buildAbilityDescription(context, { ...target, descriptions: [] }),
  ).toBeUndefined();
  expect(
    buildAbilityDescription({ ...context, generations: ['I'] }, target),
  ).toBeUndefined();
  const duplicates = Array.from({ length: 5 }, (_, index) => ({
    ...target,
    name: `duplicate-${index}`,
  }));
  expect(
    buildAbilityDescription(
      {
        ...context,
        catalog: {
          ...catalog,
          topics: { ...catalog.topics!, abilities: duplicates },
        },
      },
      target,
    ),
  ).toBeUndefined();
});
