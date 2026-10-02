import { generations } from '../../src/domain/pokemon/types.ts';
import { questionTypes as coreQuestionTypes } from '../../src/domain/quiz/questions/definitions.ts';
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
  getTrainingScoreBreakdown,
} from '../../src/domain/quiz/scoring.ts';
import { type AnswerResult } from '../../src/domain/quiz/types.ts';
import { type RoundCompletion } from '../../src/domain/sync/progress.ts';

export function completion(
  mode: RoundCompletion['mode'] = 'training',
  options: {
    failedLeague?: boolean;
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
        questionType: champion ? 'champion' : 'pokemonTypes',
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
  return {
    completionId: crypto.randomUUID(),
    mode,
    dailyDate: mode === 'daily' ? (options.dailyDate ?? '2026-09-11') : null,
    training: {
      level: 3,
      formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
      generations: [...generations],
    },
    completedAt: options.completedAt ?? '2026-09-11T10:00:00.000Z',
    result: {
      rules: {
        level: 3,
        generations: [...generations],
        formGroups: ['standard', 'regional', 'mega', 'gigantamax'],
        questionTypes: [...coreQuestionTypes],
      },
      answers,
      questionCount: count,
      correctCount: answers.filter((a) => a.correct).length,
      ...getResponseTime(answers),
      score:
        mode === 'training'
          ? getTrainingScoreBreakdown(answers, 3).score
          : calculateScore(answers),
    },
  };
}
