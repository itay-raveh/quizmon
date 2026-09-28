import { describe, expect, it } from 'vitest';
import { questionRenderingSchema } from './question-rendering';
import type { RenderingControlsFor } from '../../question-rules';
import {
  baseQuestionRendering,
  resolveQuestionRendering,
} from './question-variants';

describe('question rendering rules', () => {
  it('accepts the base rendering', () => {
    expect(
      questionRenderingSchema.safeParse(baseQuestionRendering).success,
    ).toBe(true);
  });

  it('validates the Level 5 type policy and rejects unknown values', () => {
    const rendering = resolveQuestionRendering('evolutionGainedType', 5);
    expect(rendering.subject.types).toBe('after-answer');
    expect(rendering.related.types).toBe('after-answer');
    expect(
      resolveQuestionRendering('evolutionGainedType', 3).subject.types,
    ).toBe('always');
    expect(questionRenderingSchema.safeParse(rendering).success).toBe(true);
    expect(
      questionRenderingSchema.safeParse({
        ...rendering,
        subject: { ...rendering.subject, types: 'sometimes' },
      }).success,
    ).toBe(false);
  });

  it('applies family defaults and level overrides', () => {
    const silhouette = resolveQuestionRendering('silhouetteForPokemon', 4);
    expect(silhouette.subject.sprite).toBe('never');
    expect(silhouette.choices.sprite).toBe('silhouette');
    expect(silhouette.choices.name).toBe('after-answer');

    const counterPick = resolveQuestionRendering('superEffectiveAttacker', 3);
    expect(counterPick.related.name).toBe('never');
    expect(counterPick.subject.types).toBe('after-answer');
  });
});

const unsupportedTypeChoices = {
  // @ts-expect-error TypeAnswerPicker does not consume choice rendering.
  choices: { name: 'never' },
} satisfies RenderingControlsFor<'pokemonTypes'>;
void unsupportedTypeChoices;

const unsupportedCounterPick = {
  // @ts-expect-error This artwork always reveals subject types after answering.
  subject: { types: 'never' },
} satisfies RenderingControlsFor<'superEffectiveAttacker'>;
void unsupportedCounterPick;
