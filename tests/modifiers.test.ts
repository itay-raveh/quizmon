import {
  defaultModifiers,
  getTrainingModifiers,
  normalizeModifiers,
} from '@/game/modifiers';
import { coreQuestionTypes } from '@/game/questions/definitions';
import { generations } from '@/game/types';

describe('normalizeModifiers', () => {
  it('enables every generation by default', () => {
    expect(defaultModifiers.generations).toEqual(generations);
  });

  it('returns defaults for malformed storage', () => {
    expect(normalizeModifiers('broken')).toEqual(defaultModifiers);
  });

  it('keeps valid selections and discards unknown values', () => {
    expect(
      normalizeModifiers({
        generations: ['IX', 'not-a-generation'],
        questionTypes: ['stat-showdown', 'not-a-type'],
        speedrunMode: true,
      }),
    ).toEqual({
      answerFlow: 'instant',
      generations: ['IX'],
      questionTypes: ['stat-showdown'],
      reduceMotion: false,
      soundVolume: 1,
      timerDisplay: 'seconds',
      trainingMode: 'league',
    });
  });

  it('keeps an explicit Custom mode when every question type is selected', () => {
    expect(
      normalizeModifiers({
        ...defaultModifiers,
        trainingMode: 'custom',
      }).trainingMode,
    ).toBe('custom');
  });

  it('excludes advanced formats from League Training but preserves Custom choices', () => {
    expect(
      getTrainingModifiers({
        ...defaultModifiers,
        questionTypes: ['evolution-shift'],
      }),
    ).toMatchObject({
      questionTypes: coreQuestionTypes,
      trainingMode: 'league',
    });
    expect(coreQuestionTypes).toHaveLength(15);
    for (const advanced of ['ability-check', 'move-check', 'stat-showdown']) {
      expect(coreQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingModifiers({
        ...defaultModifiers,
        questionTypes: ['ability-check', 'move-check', 'stat-showdown'],
        trainingMode: 'custom',
      }),
    ).toMatchObject({
      questionTypes: ['ability-check', 'move-check', 'stat-showdown'],
      trainingMode: 'custom',
    });
  });

  it('restores required selections when stored arrays are empty', () => {
    expect(
      normalizeModifiers({ generations: [], questionTypes: [] }),
    ).toMatchObject({
      generations: defaultModifiers.generations,
      questionTypes: defaultModifiers.questionTypes,
    });
  });
});
