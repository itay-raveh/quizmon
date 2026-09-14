import { describe, expect, it } from 'vitest';
import { isQuestionRendering } from './question-rendering';
import {
  defaultQuestionRendering,
  resolveQuestionRendering,
} from './question-variants';

describe('saved rendering type visibility', () => {
  it('accepts old snapshots without type visibility', () => {
    expect(isQuestionRendering(defaultQuestionRendering)).toBe(true);
  });

  it('validates the Level 5 type policy and rejects unknown values', () => {
    const rendering = resolveQuestionRendering('evolution-shift', 5);
    expect(isQuestionRendering(rendering)).toBe(true);
    expect(
      isQuestionRendering({
        ...rendering,
        subject: { ...rendering.subject, types: 'sometimes' },
      }),
    ).toBe(false);
  });
});
