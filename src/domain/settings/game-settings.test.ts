import { formGroups } from '../pokemon/types';
import { standardLeagueQuestionTypes } from '../quiz/questions/definitions';
import {
  defaultGameSettings,
  getTrainingSettings,
  normalizeGameSettings,
} from './game-settings';

describe('normalizeGameSettings', () => {
  it('returns defaults for malformed storage', () => {
    expect(normalizeGameSettings('broken')).toEqual(defaultGameSettings);
  });

  it('keeps valid selections and discards unknown values', () => {
    expect(
      normalizeGameSettings({
        generations: ['IX', 'not-a-generation'],
        questionTypes: ['stat-showdown', 'baby-pokemon', 'not-a-type'],
        answerFlow: 'instant',
      }),
    ).toEqual({
      difficulty: 1,
      questionSelection: 'automatic',
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

  it('preserves saved League and Custom generation rules', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['evolution-shift'],
      }),
    ).toMatchObject({
      questionTypes: standardLeagueQuestionTypes,
      trainingMode: 'league',
    });
    expect(standardLeagueQuestionTypes).toHaveLength(17);
    for (const advanced of ['ability-check', 'move-check', 'stat-showdown']) {
      expect(standardLeagueQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
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
