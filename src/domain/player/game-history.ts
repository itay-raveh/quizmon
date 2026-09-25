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
import { defaultGameSettings } from '../settings/game-settings.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import type { RoundCompletion } from '../sync/progress.ts';
import { emptyPlayerData, type PlayerData } from './player-save.ts';
import { applyResult } from './game-progress.ts';
import { scoreRound, type RoundFact } from '../sync/round-facts.ts';

function roundDiscoveries(
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
  const completionId = round.roundId;
  const victory =
    mode.kind === 'league' && isLeagueVictory(result)
      ? createLeagueVictoryRecord(
          result,
          questions,
          completionId,
          completedAt,
          trainerName,
        )
      : undefined;
  const completion: Omit<RoundCompletion, 'datasetId'> = {
    recordVersion: versions.record,
    completionId,
    completedAt,
    contentVersion: round.contentVersion,
    scoreVersion: result.scoreVersion,
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

type GameProgress = Pick<PlayerData, 'results' | 'hallOfFame' | 'pokedex'>;

export function projectRoundHistory(rounds: Iterable<RoundFact>): GameProgress {
  const data = emptyPlayerData();
  const seen = new Set<string>();
  for (const round of rounds) {
    if (seen.has(round.id)) continue;
    seen.add(round.id);
    data.pokedex = [...new Set([...data.pokedex, ...round.data.found])];
    if (!round.credited) continue;
    const result = scoreRound(round);
    const config = round.data.config;
    const settings = {
      ...defaultGameSettings,
      trainingMode: config.training_mode,
      difficulty: config.difficulty,
      questionSelection: config.question_selection,
      generations: config.generations,
      formGroups: config.form_groups,
      questionTypes: questionTypes.filter((type) =>
        config.question_types.includes(type),
      ),
      automaticQuestionTypes: questionTypes.filter((type) =>
        config.auto_types.includes(type),
      ),
    };
    const victory = round.data.victory
      ? {
          id: round.id,
          trainerName: round.data.victory.trainer_name,
          pokemon: round.data.victory.pokemon,
          completedAt: round.completed_at,
          result,
        }
      : undefined;
    applyResult(
      data,
      round.mode === 'daily'
        ? {
            kind: 'daily',
            date: round.day!,
            ...(result.dailyTrack ? { track: result.dailyTrack } : {}),
          }
        : { kind: round.mode },
      result,
      settings,
      victory,
      round.completed_at.slice(0, 10),
    );
  }
  return {
    results: data.results,
    hallOfFame: data.hallOfFame,
    pokedex: data.pokedex,
  };
}
