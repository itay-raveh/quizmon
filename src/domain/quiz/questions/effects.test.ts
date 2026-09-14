import {
  catalog,
  createQuestionContext,
} from '../../../../tests/fixtures/catalog';
import { reviewedEffects } from '../../../../scripts/reviewed-effects';
import { buildQuestionType } from './registry';
import { presentEffectQuestion } from './effect-presentation';

it.each(
  reviewedEffects.flatMap((fact) =>
    (
      [
        { difficulty: 3, mode: 'broad' },
        { difficulty: 4, mode: 'related' },
        { difficulty: 5, mode: 'exact' },
      ] as const
    ).map((variant) => ({ fact, ...variant, name: fact.name })),
  ),
)(
  'generates unambiguous $name choices at level $difficulty and restores saved presentation',
  ({ fact, difficulty, mode }) => {
    const context = createQuestionContext(`effect:${fact.name}:${difficulty}`);
    const question = buildQuestionType(
      {
        ...context,
        difficulty,
        catalog: {
          ...catalog,
          topics: {
            ...catalog.topics!,
            effects: [fact],
            abilities: catalog
              .topics!.abilities.filter((ability) => ability.name === fact.name)
              .map((ability) => ({ ...ability, descriptions: [] })),
          },
        },
      },
      fact.kind === 'ability' ? 'ability-effects' : 'held-item-effects',
    );
    expect(question).toBeDefined();
    const generated = question!;
    const expected = fact.questions[mode];
    expect(generated.answer.correctOptions).toEqual([expected.correct.value]);
    expect(generated.options).toHaveLength(4);
    expect(
      new Set(
        generated.options.map((option) => generated.optionLabels![option]),
      ).size,
    ).toBe(4);
    expect(fact.sources.length).toBeGreaterThan(0);
    expect(
      presentEffectQuestion(
        {
          ...generated,
          optionLabels: undefined,
          prompt: { kind: 'text', text: 'Historical question wording' },
        },
        reviewedEffects,
      ),
    ).toMatchObject({
      prompt: generated.prompt,
      optionLabels: generated.optionLabels,
      answer: generated.answer,
      options: generated.options,
    });
  },
);

it('preserves an unmatched saved question instead of replacing its answer keys', () => {
  const context = createQuestionContext('unknown-effect');
  const question = buildQuestionType(
    { ...context, difficulty: 5 },
    'ability-effects',
  )!;
  const saved = { ...question, options: ['old-a', 'old-b', 'old-c', 'old-d'] };
  expect(presentEffectQuestion(saved, reviewedEffects)).toBe(saved);
});
