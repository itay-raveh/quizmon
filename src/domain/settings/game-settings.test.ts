import { defaultGameSettings, getTrainingSettings } from './game-settings';
import { questionRules } from '../quiz/question-rules/registry';
import { questionTypes } from '../quiz/questions/definitions';
import { difficultyLevels, type DifficultyVariants } from '../quiz/difficulty';
import { generations } from '../pokemon/types';

describe('getTrainingSettings', () => {
  it('ends a family at its null entry while retaining earlier variants', () => {
    const availableAt = (difficulty: (typeof difficultyLevels)[number]) =>
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty,
        generations: [...generations],
      }).questionTypes;
    let cutoffs = 0;
    for (const type of questionTypes) {
      const levels = questionRules[type].levels as DifficultyVariants<unknown>;
      for (const [index, level] of difficultyLevels.entries()) {
        if (levels[level] !== null) continue;
        cutoffs += 1;
        expect(availableAt(level), `${type} at Level ${level}`).not.toContain(
          type,
        );
        expect(availableAt(difficultyLevels[index - 1]!)).toContain(type);
      }
    }
    expect(cutoffs).toBeGreaterThan(0);
    expect(availableAt(5)).toContain('pokemonFromHistoricalSprite');
  });

  it('cannot select question families without a level', () => {
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['evolutionGainedType'],
      }),
    ).toMatchObject({
      questionTypes: [],
    });
    expect(
      getTrainingSettings({
        ...defaultGameSettings,
        difficulty: undefined,
        questionTypes: ['pokemonAbilities', 'levelUpMoves', 'statExtremes'],
        trainingMode: 'custom',
      }),
    ).toMatchObject({
      questionTypes: [],
    });
  });
});
