import {
  DAILY_CHALLENGE_VERSION,
  DAILY_QUESTION_COUNT,
  getDailyModifiers,
  getDailyQuestionTypes,
} from './daily';
import {
  LEAGUE_CHALLENGE_VERSION,
  LEAGUE_QUESTION_COUNT,
  getLeagueModifiers,
  getLeagueQuestionTypes,
} from './league';
import {
  defaultModifiers,
  filterPokemon,
  TRAINING_QUESTION_COUNT,
} from './modifiers';
import { questionLabels } from './question-labels';
import {
  type ExperienceSettings,
  type SavedAnswerResult,
  type Modifiers,
  type PokemonCatalog,
  type QuestionCategory,
  type QuestionData,
} from './types';
import { buildQuestionType } from './questions/registry';
import type { QuestionContext } from './questions/shared';
import { createSeededRandom, shuffle } from './random';

const categoryLabels: Record<QuestionCategory, string> = {
  ability: questionLabels['ability-check'],
  champion: questionLabels.champion,
  description: questionLabels['field-notes'],
  evolution: questionLabels['evolution-shift'],
  identity: questionLabels['pokedex-scan'],
  matchup: questionLabels['type-matchup'],
  move: questionLabels['move-check'],
  stat: questionLabels['stat-showdown'],
  type: questionLabels['type-check'],
};

export const getQuestionCount = (
  availableCount: number,
  requestedCount = TRAINING_QUESTION_COUNT,
): number => {
  if (availableCount < 1) return 0;
  return Math.min(Math.max(1, requestedCount), availableCount);
};

const createQuestionContext = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number,
): QuestionContext => ({
  catalog,
  pool: filterPokemon(catalog, modifiers),
  random,
  used: new Set(),
});

const buildFirstAvailableQuestion = (
  context: QuestionContext,
  types: readonly QuestionData['questionType'][],
): QuestionData | undefined => {
  for (const type of types) {
    const question = buildQuestionType(context, type);
    if (question) return question;
  }
  return undefined;
};

export const buildQuestions = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number = Math.random,
  requestedCount = TRAINING_QUESTION_COUNT,
): QuestionData[] => {
  const context = createQuestionContext(catalog, modifiers, random);
  const count = getQuestionCount(context.pool.length, requestedCount);
  const questionTypeDeck = shuffle(modifiers.questionTypes, random);
  const questions: QuestionData[] = [];

  for (let index = 0; index < count; index += 1) {
    const selectedType = questionTypeDeck[index % questionTypeDeck.length];
    if (!selectedType) break;
    const candidates = [
      selectedType,
      ...shuffle(
        questionTypeDeck.filter(
          (questionType) => questionType !== selectedType,
        ),
        random,
      ),
    ];
    const question = buildFirstAvailableQuestion(context, candidates);
    if (!question) continue;
    questions.push({ ...question, id: `${question.id}:${index}` });
  }

  return questions;
};

export const buildQuestionSequence = (
  catalog: PokemonCatalog,
  questionSequence: readonly QuestionData['questionType'][],
  modifiers: Modifiers,
  random: () => number,
): QuestionData[] => {
  const context = createQuestionContext(catalog, modifiers, random);

  return questionSequence.map((questionType, index) => {
    let question = buildQuestionType(context, questionType);

    if (!question && questionType !== 'champion') {
      question = buildFirstAvailableQuestion(
        context,
        shuffle(
          modifiers.questionTypes.filter(
            (candidate) => candidate !== questionType,
          ),
          random,
        ),
      );
    }

    if (!question) {
      throw new Error(`Unable to build ${questionType} question`);
    }

    return { ...question, id: `${question.id}:${index}` };
  });
};

const baseQuestionPoints = 1_000;
const championPoints = [baseQuestionPoints, 750, 500, 250] as const;

export const getAnswerPoints = (
  question: Pick<QuestionData, 'category'>,
  correct: boolean,
  assistsUsed = 0,
): number => {
  if (!correct) return 0;
  if (question.category !== 'champion') return baseQuestionPoints;
  return championPoints[Math.max(0, Math.min(3, assistsUsed))] ?? 250;
};

const speedBonusRate = 3;
const speedBonusHalfLifeMilliseconds = 5_000;

export const getSpeedBonusPoints = (
  knowledgePoints: number,
  responseMilliseconds: number,
): number => {
  if (knowledgePoints <= 0) return 0;
  const elapsedMilliseconds = Math.max(0, responseMilliseconds);
  const bonus =
    knowledgePoints *
    speedBonusRate *
    2 ** (-elapsedMilliseconds / speedBonusHalfLifeMilliseconds);
  return Math.round(bonus / 10) * 10;
};

export const getScoreBreakdown = (answers: readonly SavedAnswerResult[]) => {
  const knowledge = answers.reduce((total, answer) => total + answer.points, 0);
  const speed = answers.reduce(
    (total, answer) => total + (answer.speedBonus ?? 0),
    0,
  );
  const mastery =
    answers.length === 0
      ? 0
      : Math.round(
          (knowledge * knowledge) / (answers.length * baseQuestionPoints),
        );
  return { knowledge, speed, mastery };
};

export const SCORE_VERSION = 2;

export const calculateScore = (
  answers: readonly SavedAnswerResult[],
): number => {
  const { knowledge, speed, mastery } = getScoreBreakdown(answers);
  return knowledge + speed + mastery;
};

export const getCategoryLabel = (
  category: SavedAnswerResult['category'],
): string =>
  category === 'cry'
    ? 'Pokémon cry'
    : category === 'scale'
      ? 'Scale comparison'
      : categoryLabels[category];

export const isQuestionAnswerCorrect = (
  question: QuestionData,
  selectedOptions: readonly string[],
): boolean => {
  const selected = new Set(selectedOptions);
  return (
    selected.size === question.answer.correctOptions.length &&
    question.answer.correctOptions.every((option) => selected.has(option))
  );
};

export const getQuestionTitle = (question: QuestionData): string =>
  question.title ?? getCategoryLabel(question.category);

export const getResponseTime = (
  answers: readonly Pick<SavedAnswerResult, 'responseMilliseconds'>[],
) => {
  const elapsedMilliseconds = answers.reduce(
    (total, answer) => total + (answer.responseMilliseconds ?? 0),
    0,
  );
  return {
    elapsedMilliseconds,
    elapsedSeconds: Math.floor(elapsedMilliseconds / 1_000),
  };
};

export const buildDailyQuestions = (
  catalog: PokemonCatalog,
  date: string,
): QuestionData[] => {
  const questions = buildQuestionSequence(
    catalog,
    getDailyQuestionTypes(date),
    getDailyModifiers(defaultModifiers),
    createSeededRandom(`quizmon-daily-v${DAILY_CHALLENGE_VERSION}:${date}`),
  );

  if (questions.length !== DAILY_QUESTION_COUNT) {
    throw new Error('Daily Challenge must contain exactly five questions');
  }

  return questions;
};

export const buildLeagueQuestions = (
  catalog: PokemonCatalog,
  seed: string,
  experience: ExperienceSettings,
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
