import { standardLeagueQuestionTypes } from '../quiz/questions/definitions';
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
});
