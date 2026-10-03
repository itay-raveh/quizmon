import { expect, it } from 'vitest';
import { questionTypes } from './questions/definitions.ts';
import { orderTrainingQuestionTypes } from './question-generation.ts';

it("halves a previous Training format's draw weight without excluding it", () => {
  const [recent, fresh] = questionTypes;
  const types = [recent!, fresh!];
  const previous = new Set([recent!]);

  expect(orderTrainingQuestionTypes(types, previous, () => 0.2)).toEqual([
    recent,
    fresh,
  ]);
  expect(orderTrainingQuestionTypes(types, previous, () => 0.4)).toEqual([
    fresh,
    recent,
  ]);
});
