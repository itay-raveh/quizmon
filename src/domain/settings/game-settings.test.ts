import { leagueQuestionTypes } from '../quiz/questions/definitions';
import { defaultGameSettings, getTrainingSettings } from './game-settings';

describe('getTrainingSettings', () => {
  it('preserves saved League and Custom generation rules', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['evolution-gained-type'],
      }),
    ).toMatchObject({
      questionTypes: leagueQuestionTypes,
      trainingMode: 'league',
    });
    expect(leagueQuestionTypes).toHaveLength(17);
    for (const advanced of [
      'pokemon-abilities',
      'level-up-moves',
      'stat-extremes',
    ]) {
      expect(leagueQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['pokemon-abilities', 'level-up-moves', 'stat-extremes'],
        trainingMode: 'custom',
      }),
    ).toMatchObject({
      questionTypes: ['pokemon-abilities', 'level-up-moves', 'stat-extremes'],
      trainingMode: 'custom',
    });
  });
});
