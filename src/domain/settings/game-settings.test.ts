import { leagueQuestionTypes } from '../quiz/questions/definitions';
import { defaultGameSettings, getTrainingSettings } from './game-settings';
import { questionRules } from '../quiz/question-rules/registry';
import { questionTypes } from '../quiz/questions/definitions';

describe('getTrainingSettings', () => {
  it('removes families after their last level while retaining ongoing formats', () => {
    for (const difficulty of [2, 3, 4, 5] as const) {
      const available = getTrainingSettings({
        ...defaultGameSettings,
        difficulty,
      }).questionTypes;
      for (const type of questionTypes) {
        const row = questionRules[type];
        const lastLevel = 'lastLevel' in row ? row.lastLevel : undefined;
        if (lastLevel !== undefined && difficulty > lastLevel)
          expect(available, `${type} at Level ${difficulty}`).not.toContain(
            type,
          );
      }
      expect(available).toContain('pokemonFromHistoricalSprite');
    }
  });

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
