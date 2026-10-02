import type { GameResult } from './types.ts';
import type { Level } from './level.ts';

const LEAGUE_STAGE_SIZE = 3;

export type LeagueView = 'challenge' | 'hall';

export interface LeagueStage {
  heading: string;
  id: 'elite-1' | 'elite-2' | 'elite-3' | 'elite-4' | 'champion';
  level: Level;
  marker: string;
  title: string;
}

export const leagueStages: readonly LeagueStage[] = [
  {
    heading: 'Elite Trial I',
    id: 'elite-1',
    level: 1,
    marker: 'I',
    title: 'Recognition',
  },
  {
    heading: 'Elite Trial II',
    id: 'elite-2',
    level: 2,
    marker: 'II',
    title: 'Field Knowledge',
  },
  {
    heading: 'Elite Trial III',
    id: 'elite-3',
    level: 3,
    marker: 'III',
    title: 'Pokémon Knowledge',
  },
  {
    heading: 'Elite Trial IV',
    id: 'elite-4',
    level: 4,
    marker: 'IV',
    title: 'Battle Judgment',
  },
  {
    heading: 'Champion',
    id: 'champion',
    level: 5,
    marker: 'C',
    title: 'Final Trial',
  },
];

export const LEAGUE_QUESTION_COUNT = leagueStages.length * LEAGUE_STAGE_SIZE;

export { getChallengeSettings as getLeagueSettings } from '../settings/game-settings.ts';

export const getLeagueStage = (questionNumber: number): LeagueStage =>
  leagueStages[
    Math.min(
      leagueStages.length - 1,
      Math.max(0, Math.floor((questionNumber - 1) / LEAGUE_STAGE_SIZE)),
    )
  ] ?? leagueStages[0]!;

export const isLeagueVictory = (result: GameResult): boolean =>
  result.answers.length === LEAGUE_QUESTION_COUNT &&
  result.questionCount === LEAGUE_QUESTION_COUNT &&
  result.correctCount === LEAGUE_QUESTION_COUNT;
