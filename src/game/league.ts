import { buildQuestionSequence, defaultModifiers } from './game';
import { createSeededRandom, shuffle } from './random';
import {
  generations,
  type GameResult,
  type Modifiers,
  type PokemonCatalog,
  type QuestionData,
  type QuestionType,
} from './types';

const LEAGUE_CHALLENGE_VERSION = 1;

export const LEAGUE_QUESTION_COUNT = 15;
const LEAGUE_STAGE_SIZE = 3;

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

const stageQuestionTypes: readonly (readonly QuestionType[])[] = [
  ['pokedex-scan', 'silhouette-match', 'pixel-peek'],
  ['shiny-spotter', 'field-notes', 'evolution-shift'],
  ['type-check', 'type-roundup', 'ability-check'],
  ['move-check', 'stat-showdown', 'type-matchup'],
];

export const getLeagueModifiers = (
  experience: Pick<
    Modifiers,
    'answerFlow' | 'reduceMotion' | 'soundVolume' | 'timerDisplay'
  >,
): Modifiers => ({
  ...defaultModifiers,
  answerFlow: experience.answerFlow,
  generations: [...generations],
  reduceMotion: experience.reduceMotion,
  soundVolume: experience.soundVolume,
  timerDisplay: experience.timerDisplay,
});

export const getLeagueQuestionTypes = (
  seed: string,
): (QuestionType | 'champion')[] => [
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

export const buildLeagueQuestions = (
  catalog: PokemonCatalog,
  seed: string,
  experience: Pick<
    Modifiers,
    'answerFlow' | 'reduceMotion' | 'soundVolume' | 'timerDisplay'
  >,
): QuestionData[] => {
  const modifiers = getLeagueModifiers(experience);
  const questions = buildQuestionSequence(
    catalog,
    getLeagueQuestionTypes(seed),
    modifiers,
    createSeededRandom(`quizmon-league-v${LEAGUE_CHALLENGE_VERSION}:${seed}`),
  );

  if (
    questions.length !== LEAGUE_QUESTION_COUNT ||
    new Set(questions.map(({ questionType }) => questionType)).size !==
      LEAGUE_QUESTION_COUNT
  ) {
    throw new Error('Quizmon League must contain 15 unique question formats');
  }

  return questions;
};

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
