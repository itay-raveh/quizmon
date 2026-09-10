import { createSeededRandom, shuffle } from './random';
import type { GameResult, QuestionData, QuestionType } from './types';

export const LEAGUE_CHALLENGE_VERSION = 3;

const LEAGUE_STAGE_SIZE = 3;

export type LeagueView = 'challenge' | 'hall';

export interface LeagueStage {
  heading: string;
  id: 'elite-1' | 'elite-2' | 'elite-3' | 'elite-4' | 'champion';
  marker: string;
  title: string;
}

export const leagueStages: readonly LeagueStage[] = [
  {
    heading: 'Elite Trial I',
    id: 'elite-1',
    marker: 'I',
    title: 'Recognition',
  },
  {
    heading: 'Elite Trial II',
    id: 'elite-2',
    marker: 'II',
    title: 'Field Knowledge',
  },
  {
    heading: 'Elite Trial III',
    id: 'elite-3',
    marker: 'III',
    title: 'Pokémon Knowledge',
  },
  {
    heading: 'Elite Trial IV',
    id: 'elite-4',
    marker: 'IV',
    title: 'Battle Judgment',
  },
  {
    heading: 'Champion',
    id: 'champion',
    marker: 'C',
    title: 'Final Trial',
  },
];

export const LEAGUE_QUESTION_COUNT = leagueStages.length * LEAGUE_STAGE_SIZE;

const stageQuestionTypes: readonly (readonly QuestionType[])[] = [
  ['pokedex-scan', 'silhouette-match', 'pixel-peek'],
  ['shiny-spotter', 'field-notes', 'evolution-shift'],
  ['type-check', 'type-roundup', 'ability-check'],
  ['move-check', 'stat-showdown', 'type-matchup'],
];

export { getChallengeModifiers as getLeagueModifiers } from './modifiers';

export const getLeagueQuestionTypes = (
  seed: string,
): QuestionData['questionType'][] => [
  ...stageQuestionTypes.flatMap((types, index) =>
    shuffle(
      types,
      createSeededRandom(
        `quizmon-league-types-v${LEAGUE_CHALLENGE_VERSION}:${seed}:${index}`,
      ),
    ),
  ),
  ...shuffle(
    ['odd-one-out', 'counter-pick'] as const,
    createSeededRandom(
      `quizmon-league-types-v${LEAGUE_CHALLENGE_VERSION}:${seed}:champion`,
    ),
  ),
  'champion',
];

export const getLeagueStage = (questionNumber: number): LeagueStage =>
  leagueStages[
    Math.min(
      leagueStages.length - 1,
      Math.max(0, Math.floor((questionNumber - 1) / LEAGUE_STAGE_SIZE)),
    )
  ] ?? leagueStages[0]!;

export const getLeagueStageLabel = (questionNumber: number): string => {
  const stage = getLeagueStage(questionNumber);
  return `${stage.heading} · ${stage.title}`;
};

export const isLeagueVictory = (result: GameResult): boolean =>
  result.answers.length === LEAGUE_QUESTION_COUNT &&
  result.questionCount === LEAGUE_QUESTION_COUNT &&
  result.correctCount === LEAGUE_QUESTION_COUNT;
