import { formGroups, generations } from '../pokemon/types';
import { coreQuestionTypes } from '../quiz/questions/definitions';
import {
  defaultGameSettings,
  getTrainingSettings,
  normalizeGameSettings,
} from './game-settings';

describe('normalizeGameSettings', () => {
  it('starts new players at Level 1 with Gen I', () => {
    expect(defaultGameSettings.generations).toEqual(['I']);
    expect(defaultGameSettings.difficulty).toBe(1);
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
      difficulty: 3,
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

  it('migrates legacy preferences without changing scope or custom families', () => {
    expect(
      normalizeGameSettings({
        generations: [...generations],
        formGroups: ['regional'],
        trainingMode: 'custom',
        questionTypes: ['type-check'],
      }),
    ).toMatchObject({
      difficulty: 3,
      questionSelection: 'custom',
      generations,
      formGroups: ['regional'],
      questionTypes: ['type-check'],
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

  it('preserves legacy League and Custom generation rules', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
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
