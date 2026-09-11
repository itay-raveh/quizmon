import { formGroups, generations } from '../pokemon/types';
import { coreQuestionTypes } from '../quiz/questions/definitions';
import {
  defaultGameSettings,
  getTrainingSettings,
  normalizeGameSettings,
} from './game-settings';

describe('normalizeGameSettings', () => {
  it('enables every generation by default', () => {
    expect(defaultGameSettings.generations).toEqual(generations);
  });

  it('returns defaults for malformed storage', () => {
    expect(normalizeGameSettings('broken')).toEqual(defaultGameSettings);
  });

  it('keeps valid selections and discards unknown values', () => {
    expect(
      normalizeGameSettings({
        generations: ['IX', 'not-a-generation'],
        questionTypes: ['stat-showdown', 'not-a-type'],
        speedrunMode: true,
      }),
    ).toEqual({
      answerFlow: 'instant',
      formGroups: [...formGroups],
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
      normalizeGameSettings({
        ...defaultGameSettings,
        trainingMode: 'custom',
      }).trainingMode,
    ).toBe('custom');
  });

  it('excludes advanced formats from League Training but preserves Custom choices', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        questionTypes: ['evolution-shift'],
      }),
    ).toMatchObject({
      questionTypes: coreQuestionTypes,
      trainingMode: 'league',
    });
    expect(coreQuestionTypes).toHaveLength(17);
    for (const advanced of ['ability-check', 'move-check', 'stat-showdown']) {
      expect(coreQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
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
      normalizeGameSettings({ generations: [], questionTypes: [] }),
    ).toMatchObject({
      generations: defaultGameSettings.generations,
      questionTypes: defaultGameSettings.questionTypes,
    });
  });
});
