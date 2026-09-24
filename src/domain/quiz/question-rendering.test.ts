import { describe, expect, it } from 'vitest';
import { questionRenderingSchema } from './question-rendering';
import {
  defaultQuestionRendering,
  resolveQuestionRendering,
} from './question-variants';

describe('saved rendering type visibility', () => {
  it('accepts old snapshots without type visibility', () => {
    expect(
      questionRenderingSchema.safeParse(defaultQuestionRendering).success,
    ).toBe(true);
  });

  it('validates the Level 5 type policy and rejects unknown values', () => {
    const rendering = resolveQuestionRendering('evolution-shift', 5);
    expect(questionRenderingSchema.safeParse(rendering).success).toBe(true);
    expect(
      questionRenderingSchema.safeParse({
        ...rendering,
        subject: { ...rendering.subject, types: 'sometimes' },
      }).success,
    ).toBe(false);
  });
});
