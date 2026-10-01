import { questionRenderingSchema } from './rendering';
import { baseQuestionRendering } from './variants';

it('rejects invalid saved rendering values', () => {
  expect(questionRenderingSchema.safeParse(baseQuestionRendering).success).toBe(
    true,
  );
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
