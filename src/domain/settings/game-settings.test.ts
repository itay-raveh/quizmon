import { leagueQuestionTypes } from '../quiz/questions/definitions';
import { defaultGameSettings, getTrainingSettings } from './game-settings';

describe('getTrainingSettings', () => {
  it('preserves saved League and Custom generation rules', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['evolutionGainedType'],
      }),
    ).toMatchObject({
      questionTypes: leagueQuestionTypes,
      trainingMode: 'league',
    });
    expect(leagueQuestionTypes).toHaveLength(17);
    for (const advanced of [
      'pokemonAbilities',
      'levelUpMoves',
      'statExtremes',
    ]) {
      expect(leagueQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['pokemonAbilities', 'levelUpMoves', 'statExtremes'],
        trainingMode: 'custom',
      }),
    ).toMatchObject({
      questionTypes: ['pokemonAbilities', 'levelUpMoves', 'statExtremes'],
      trainingMode: 'custom',
    });
  });
});
