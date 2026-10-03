import { generations } from '../../src/domain/pokemon/types.ts';
import { questionTypes as coreQuestionTypes } from '../../src/domain/quiz/questions/definitions.ts';
import {
  getResponseTime,
  getRoundAnswerLevel,
  getScoreBreakdown,
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
        points: 0,
        speedBonus: 0,
      };
    },
  );
  const gameMode =
    mode === 'daily'
      ? { kind: 'daily' as const, date: options.dailyDate ?? '2026-09-11' }
      : { kind: mode };
  const scoring = getScoreBreakdown(answers, (index) =>
    getRoundAnswerLevel(gameMode, 3, index),
  );
  answers.forEach((answer, index) => {
    answer.points = scoring.awards[index]!.points;
    answer.speedBonus = scoring.awards[index]!.speedBonus;
  });
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
      score: scoring.score,
    },
  };
}
