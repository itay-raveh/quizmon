import { defaultGameSettings } from '../settings/game-settings';
import { questionTypes } from '../quiz/questions/definitions';
import { getUnifiedScoreKey, SCORE_VERSION } from '../quiz/scoring';
import {
  trainingConfig,
  versions,
  type RoundCompletion,
} from '../sync/progress';
import { applyRecordedGame } from './game-history';
import { emptyPlayerData } from './player-save';

it('records the result and discoveries of a completed training round', () => {
  const completion: RoundCompletion = {
    recordVersion: versions.record,
    completionId: crypto.randomUUID(),
    datasetId: crypto.randomUUID(),
    contentVersion: versions.content,
    scoreVersion: SCORE_VERSION,
    progressVersion: versions.progress,
    generatorVersion: 0,
    mode: 'training',
    dailyDate: null,
    training: trainingConfig(defaultGameSettings),
    completedAt: new Date().toISOString(),
    result: {
      answers: [
        {
          category: 'identity',
          cluesUsed: 0,
          correct: true,
          points: 10,
          questionType: questionTypes[0]!,
          subject: { kind: 'pokemon', name: 'Pikachu', generation: 'I' },
        },
      ],
      contentVersion: versions.content,
      correctCount: 1,
      elapsedMilliseconds: 1000,
      elapsedSeconds: 1,
      questionCount: 1,
      score: 10,
      scoreVersion: SCORE_VERSION,
    },
    discoveries: ['Pikachu'],
    victory: null,
  };
  const live = emptyPlayerData();
  const outcome = applyRecordedGame(live, { completion, eligible: true });

  expect(outcome).toEqual({ best: completion.result, isNewBest: true });
  expect(live.results.training[getUnifiedScoreKey(completion.result)]).toEqual(
    completion.result,
  );
  expect(live.pokedex).toEqual(['Pikachu']);
});
