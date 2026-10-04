import { expect, it } from 'vitest';
import { questionTypes } from './questions/definitions.ts';
import { orderTrainingQuestionTypes } from './question-generation.ts';
import { questionRules } from './question-rules/registry.ts';
import {
  defaultGameSettings,
  getTrainingSettings,
} from '../settings/game-settings.ts';
import { getQuestionScore } from './scoring.ts';

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

it('keeps a retired family playable and scored in Custom but out of automatic Training', () => {
  const type = 'pokemonTypes';
  const row = questionRules[type];
  const hadActive = Object.hasOwn(row, 'active');
  const previous: unknown = Reflect.get(row, 'active');
  Reflect.set(row, 'active', false);
  try {
    const settings = { ...defaultGameSettings, level: 3 as const };
    expect(getTrainingSettings(settings).questionTypes).not.toContain(type);
    expect(
      getTrainingSettings({
        ...settings,
        questionSelection: 'custom',
        questionTypes: [type],
      }).questionTypes,
    ).toEqual([type]);
    expect(
      getQuestionScore({ questionType: type, correct: true }, 3).score,
    ).toBeGreaterThan(0);
  } finally {
    if (hadActive) Reflect.set(row, 'active', previous);
    else Reflect.deleteProperty(row, 'active');
  }
});
