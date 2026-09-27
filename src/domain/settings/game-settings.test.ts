import { leagueQuestionTypes } from '../quiz/questions/definitions';
import { defaultGameSettings, getTrainingSettings } from './game-settings';

describe('getTrainingSettings', () => {
  it('preserves saved League and Custom generation rules', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['evolution-shift'],
      }),
    ).toMatchObject({
      questionTypes: leagueQuestionTypes,
      trainingMode: 'league',
    });
    expect(leagueQuestionTypes).toHaveLength(17);
    for (const advanced of ['ability-check', 'move-check', 'stat-showdown']) {
      expect(leagueQuestionTypes).not.toContain(advanced);
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
});
