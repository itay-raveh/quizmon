import { getTrainingScoreMultipliers } from '../../src/domain/quiz/score-multipliers.ts';
import { generations } from '../../src/domain/pokemon/types.ts';
import { standardLeagueQuestionTypes as coreQuestionTypes } from '../../src/domain/quiz/questions/definitions.ts';
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../../src/domain/quiz/scoring.ts';
import { type AnswerResult } from '../../src/domain/quiz/types.ts';
import {
  type Action,
  type RoundCompletion,
  versions,
} from '../../src/domain/sync/progress.ts';

export function completion(
  datasetId: string,
  mode: RoundCompletion['mode'] = 'training',
  options: {
    failedLeague?: boolean;
    discoveries?: string[];
    completedAt?: string;
    dailyDate?: string;
    assistsUsed?: number;
  } = {},
): RoundCompletion {
  const count = mode === 'daily' ? 5 : mode === 'league' ? 15 : 10;
  const answers: AnswerResult[] = Array.from(
    { length: options.failedLeague ? 3 : count },
    (_, index) => {
      const champion = mode !== 'training' && index === count - 1;
      const correct = !options.failedLeague || index < 2;
      const category = champion ? 'champion' : 'type';
      const assistsUsed = champion ? (options.assistsUsed ?? 0) : 0;
      const points = getAnswerPoints({ category }, correct, assistsUsed);
      return {
        observation: {
          questionId: `fixture-${index}`,
          prompt: { kind: 'text', text: 'Choose the matching answer.' },
          interaction: 'single-choice',
          options: ['bulbasaur', 'ivysaur'],
          expected: ['bulbasaur'],
          selected: [correct ? 'bulbasaur' : 'ivysaur'],
        },
        subject: { kind: 'pokemon', name: 'bulbasaur', generation: 'I' },
        questionType: champion ? 'champion' : 'type-check',
        category,
        cluesUsed: assistsUsed,
        correct,
        ...(champion ? { unassistedSearch: false } : {}),
        responseMilliseconds: 1000,
        points,
        speedBonus: getSpeedBonusPoints(points, 1000),
      };
    },
  );
  const scoreMultipliers =
    mode === 'training'
      ? getTrainingScoreMultipliers(
          {
            difficulty: 3,
            formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
            generations: [...generations],
            questionTypes: [...coreQuestionTypes],
          },
          answers,
        )
      : undefined;
  return {
    recordVersion: 1,
    completionId: crypto.randomUUID(),
    datasetId,
    mode,
    dailyDate: mode === 'daily' ? (options.dailyDate ?? '2026-09-11') : null,
    training: {
      trainingMode: 'league',
      difficulty: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: [...generations],
      questionTypes: [...coreQuestionTypes],
    },
    contentVersion: versions.content,
    progressVersion: versions.progress,
    scoreVersion: 1,
    generatorVersion: 0,
    completedAt: options.completedAt ?? '2026-09-11T10:00:00.000Z',
    discoveries: options.discoveries ?? ['bulbasaur'],
    result: {
      ...(mode === 'daily' ? { puzzleId: 'a'.repeat(64) } : {}),
      rules: {
        version: versions.content,
        difficulty: 3,
        generations: [...generations],
        formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
        questionTypes: [...coreQuestionTypes],
      },
      answers,
      contentVersion: versions.content,
      scoreVersion: 1,
      questionCount: count,
      correctCount: answers.filter((a) => a.correct).length,
      ...getResponseTime(answers),
      ...(scoreMultipliers ? { scoreMultipliers } : {}),
      score: calculateScore(answers, scoreMultipliers),
    },
    victory:
      mode === 'league' && !options.failedLeague
        ? { trainerName: 'Pilot Trainer', pokemon: ['bulbasaur'] }
        : null,
  };
}
export const action = (
  datasetId: string,
  generationId: string,
  kind: Action['kind'],
  payload: unknown,
): Action => ({
  operationId: crypto.randomUUID(),
  datasetId,
  generationId,
  payloadVersion: versions.payload,
  kind,
  payload,
});
