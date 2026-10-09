import { questionRenderingSchema } from './rendering';
import { baseQuestionRendering } from './variants';

it('rejects invalid saved rendering values', () => {
  expect(
    questionRenderingSchema.safeParse({
      ...baseQuestionRendering,
      search: { ...baseQuestionRendering.search, name: 'never' },
    }).success,
  ).toBe(false);
  expect(
    questionRenderingSchema.safeParse({
      ...baseQuestionRendering,
      subject: { ...baseQuestionRendering.subject, types: 'sometimes' },
    }).success,
  ).toBe(false);
});

it('rejects impossible probability values while accepting saved source policies', () => {
  for (const probability of [-0.1, 1.1, Infinity, NaN]) {
    for (const field of [
      'historicalSpriteChance',
      'backSpriteChance',
      'silhouetteChance',
    ]) {
      expect(
        questionRenderingSchema.safeParse({
          ...baseQuestionRendering,
          subject: {
            ...baseQuestionRendering.subject,
            sprite: {
              reveal: 'always',
              silhouette: false,
              [field]: probability,
            },
          },
        }).success,
      ).toBe(false);
    }
  }
  expect(
    questionRenderingSchema.safeParse({
      ...baseQuestionRendering,
      subject: {
        ...baseQuestionRendering.subject,
        sprite: { reveal: 'always', silhouette: true, source: 'all' },
      },
    }).success,
  ).toBe(true);
});
