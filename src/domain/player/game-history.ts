import type { ActiveGameSnapshot } from './active-game.ts';
import { createLeagueVictoryRecord } from './hall-of-fame.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { getQuestionPokemon } from '../quiz/question-pokemon.ts';
import { snapshotRoundRules } from '../quiz/round-rules.ts';
import { getPuzzleId } from '../quiz/puzzle-id.ts';
import {
  SCORE_VERSION,
  calculateScore,
  getResponseTime,
} from '../quiz/scoring.ts';
import { trainingConfig, versions } from '../sync/progress.ts';
import { formatVersions } from '../versions.ts';
import {
  isRecord,
  isUuid,
  isDailyDate,
  isUtcTimestamp,
  isSafeNonnegativeInteger,
} from '../../lib/validation.ts';
import { isAnswerObservation } from '../quiz/answer-observation.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import type { RoundCompletion } from '../sync/progress.ts';
import { emptyPlayerData, type PlayerData } from './player-save.ts';
import { applyResult } from './game-progress.ts';

export function roundDiscoveries(
  round: Pick<ActiveGameSnapshot, 'answers' | 'questions'>,
) {
  return [
    ...new Set(
      round.answers.flatMap((answer, index) =>
        answer.correct && round.questions[index]
          ? getQuestionPokemon(round.questions[index])
          : [],
      ),
    ),
  ].sort();
}

export async function completeRound(
  round: Pick<
    ActiveGameSnapshot,
    | 'answers'
    | 'questions'
    | 'settings'
    | 'mode'
    | 'contentVersion'
    | 'seed'
    | 'scoreMultipliers'
    | 'roundId'
  >,
  completedAt: string,
  trainerName: string,
) {
  const { answers, questions, settings, mode, scoreMultipliers } = round;
  const rules = snapshotRoundRules(settings, questions);
  const puzzleId =
    mode.kind === 'daily' ? await getPuzzleId(questions) : undefined;
  const result = {
    ...(rules ? { rules } : {}),
    ...(mode.kind === 'daily' && mode.track ? { dailyTrack: mode.track } : {}),
    ...(puzzleId ? { puzzleId } : {}),
    answers,
    ...(scoreMultipliers ? { scoreMultipliers } : {}),
    contentVersion: round.contentVersion,
    correctCount: answers.filter(({ correct }) => correct).length,
    ...getResponseTime(answers),
    questionCount: questions.length,
    score: calculateScore(answers, scoreMultipliers),
    scoreVersion: SCORE_VERSION,
  };
  const victory =
    mode.kind === 'league' && isLeagueVictory(result)
      ? {
          ...createLeagueVictoryRecord(
            result,
            questions,
            round.seed,
            trainerName,
          ),
          completedAt,
        }
      : undefined;
  const completion: Omit<RoundCompletion, 'datasetId'> = {
    recordVersion: versions.record,
    completionId: round.roundId ?? round.seed,
    completedAt,
    contentVersion: round.contentVersion,
    scoreVersion: result.scoreVersion,
    progressVersion: versions.progress,
    generatorVersion: 0,
    mode: mode.kind,
    dailyDate: mode.kind === 'daily' ? mode.date : null,
    training: trainingConfig(settings),
    result,
    discoveries: roundDiscoveries(round),
    victory: victory
      ? { trainerName: victory.trainerName, pokemon: victory.pokemon }
      : null,
  };
  return { completion, victory };
}

export const progressProjectionVersion = 1;
export interface RecordedGame {
  completion: RoundCompletion;
  eligible: boolean;
}
export type GameProgress = Pick<
  PlayerData,
  'results' | 'hallOfFame' | 'pokedex'
>;

// Archive reads must not depend on the current catalog or question generator.
export function readRecordedGame(value: unknown): RoundCompletion {
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.every((item) => typeof item === 'string' && item.length <= 2000);
  const finite = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (
    !isRecord(value) ||
    value.recordVersion !== formatVersions.completion ||
    !isUuid(value.completionId) ||
    !isUuid(value.datasetId) ||
    !['daily', 'training', 'league'].includes(String(value.mode)) ||
    !isUtcTimestamp(value.completedAt) ||
    (value.mode === 'daily'
      ? !isDailyDate(value.dailyDate)
      : value.dailyDate !== null) ||
    ![
      'contentVersion',
      'scoreVersion',
      'generatorVersion',
      'progressVersion',
    ].every((key) => isSafeNonnegativeInteger(value[key])) ||
    !isRecord(value.training) ||
    !strings(value.training.questionTypes) ||
    !strings(value.training.generations) ||
    !strings(value.discoveries) ||
    !isRecord(value.result)
  )
    throw new Error(
      'This game record is damaged or uses an unsupported format.',
    );
  const result = value.result;
  if (
    (result.puzzleId !== undefined &&
      (typeof result.puzzleId !== 'string' ||
        !/^[a-f0-9]{64}$/.test(result.puzzleId))) ||
    !Array.isArray(result.answers) ||
    !result.answers.length ||
    !isSafeNonnegativeInteger(result.questionCount) ||
    result.answers.length > result.questionCount ||
    !isSafeNonnegativeInteger(result.score) ||
    !isSafeNonnegativeInteger(result.correctCount) ||
    result.correctCount > result.questionCount ||
    !finite(result.elapsedMilliseconds) ||
    !finite(result.elapsedSeconds) ||
    !result.answers.every(
      (answer) =>
        isRecord(answer) &&
        isAnswerObservation(answer.observation) &&
        typeof answer.correct === 'boolean' &&
        typeof answer.category === 'string' &&
        typeof answer.questionType === 'string' &&
        isRecord(answer.subject) &&
        typeof answer.subject.kind === 'string' &&
        typeof answer.subject.name === 'string' &&
        isSafeNonnegativeInteger(answer.cluesUsed) &&
        finite(answer.responseMilliseconds) &&
        finite(answer.points) &&
        finite(answer.speedBonus),
    ) ||
    (value.victory !== null &&
      (!isRecord(value.victory) ||
        typeof value.victory.trainerName !== 'string' ||
        !strings(value.victory.pokemon)))
  )
    throw new Error('This game record contains invalid answer data.');
  return value as unknown as RoundCompletion;
}

export function applyRecordedGame(
  data: PlayerData,
  { completion: game, eligible }: RecordedGame,
) {
  if (eligible)
    applyResult(
      data,
      game.mode === 'daily'
        ? {
            kind: 'daily',
            date: game.dailyDate!,
            ...(game.result.dailyTrack
              ? { track: game.result.dailyTrack }
              : {}),
          }
        : { kind: game.mode },
      game.result,
      {
        ...defaultGameSettings,
        ...game.training,
        formGroups: game.training.formGroups ?? defaultGameSettings.formGroups,
      },
      game.victory
        ? {
            ...game.victory,
            id: game.completionId,
            completedAt: game.completedAt,
            result: game.result,
          }
        : undefined,
      game.completedAt.slice(0, 10),
    );
  data.pokedex = [...new Set([...data.pokedex, ...game.discoveries])];
}

export function projectGameHistory(
  games: Iterable<RecordedGame>,
): GameProgress {
  const data = emptyPlayerData();
  const seen = new Set<string>();
  for (const game of games) {
    if (seen.has(game.completion.completionId)) continue;
    seen.add(game.completion.completionId);
    applyRecordedGame(data, game);
  }
  return {
    results: data.results,
    hallOfFame: data.hallOfFame,
    pokedex: data.pokedex,
  };
}
