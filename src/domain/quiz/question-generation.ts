import { QUESTION_RULES_VERSION } from './question-variants';
import { createSeededRandom, shuffle } from '../../lib/random';
import type { PokemonCatalog } from '../pokemon/types';
import {
  TRAINING_QUESTION_COUNT,
  defaultGameSettings,
  filterPokemon,
  getTrainingSettings,
} from '../settings/game-settings';
import type { ExperienceSettings, GameSettings } from '../settings/types';
import {
  DAILY_CHALLENGE_VERSION,
  DAILY_QUESTION_COUNT,
  getDailyQuestionTypes,
  getDailyRotation,
  getDailySettings,
} from './daily';
import {
  LEAGUE_CHALLENGE_VERSION,
  LEAGUE_QUESTION_COUNT,
  getLeagueQuestionTypes,
  getLeagueSettings,
} from './league';
import { type QuestionHistory, emptyQuestionHistory } from './question-history';
import type { QuestionContext } from './questions/context';
import { buildQuestionType } from './questions/registry';
import type { QuestionData } from './types';

export const getQuestionCount = (
  availableCount: number,
  requestedCount: number,
): number => {
  if (availableCount < 1) return 0;
  return Math.min(Math.max(1, requestedCount), availableCount);
};

const createQuestionContext = (
  catalog: PokemonCatalog,
  settings: GameSettings,
  random: () => number,
  history?: QuestionHistory,
): QuestionContext => ({
  catalog,
  difficulty: settings.difficulty,
  pool: filterPokemon(catalog, settings),
  random,
  used: new Set(),
  history,
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
  settings: GameSettings,
  random: () => number,
  requestedCount = TRAINING_QUESTION_COUNT,
  history?: QuestionHistory,
): QuestionData[] => {
  const context = createQuestionContext(catalog, settings, random, history);
  const count = settings.difficulty
    ? context.pool.length
      ? requestedCount
      : 0
    : getQuestionCount(context.pool.length, requestedCount);
  const questionTypeDeck = shuffle(settings.questionTypes, random);
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
  settings: GameSettings,
  random: () => number,
  history?: QuestionHistory,
  rotations?: readonly number[],
): QuestionData[] => {
  const context = createQuestionContext(catalog, settings, random, history);

  context.rotation = rotations?.at(-1);
  const finale =
    rotations && questionSequence.at(-1) === 'champion'
      ? buildQuestionType(context, 'champion')
      : undefined;
  return questionSequence.map((questionType, index) => {
    context.rotation = rotations?.[index];
    let question =
      finale && index === questionSequence.length - 1
        ? finale
        : buildQuestionType(context, questionType);

    if (!question && questionType !== 'champion') {
      question = buildFirstAvailableQuestion(
        context,
        shuffle(
          settings.questionTypes.filter(
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

export const buildDailyQuestions = (
  catalog: PokemonCatalog,
  date: string,
): QuestionData[] => {
  const questions = buildQuestionSequence(
    catalog,
    getDailyQuestionTypes(date),
    getDailySettings(defaultGameSettings),
    createSeededRandom(`quizmon-daily-v${DAILY_CHALLENGE_VERSION}:${date}`),
    emptyQuestionHistory(),
    getDailyRotation(date),
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
  history?: QuestionHistory,
): QuestionData[] => {
  const settings = getLeagueSettings(experience);
  const questions = buildQuestionSequence(
    catalog,
    getLeagueQuestionTypes(seed),
    settings,
    createSeededRandom(`quizmon-league-v${LEAGUE_CHALLENGE_VERSION}:${seed}`),
    history,
  );

  if (
    questions.length !== LEAGUE_QUESTION_COUNT ||
    new Set(questions.map(({ questionType }) => questionType)).size !==
      LEAGUE_QUESTION_COUNT
  ) {
    throw new Error(
      `Quizmon League must contain ${LEAGUE_QUESTION_COUNT} unique question formats`,
    );
  }

  return questions;
};

export const buildDailyTrackQuestions = (
  catalog: PokemonCatalog,
  date: string,
  settings: GameSettings,
  scope: string,
): QuestionData[] => {
  const identity = `${scope}:${settings.difficulty}:rules${QUESTION_RULES_VERSION}:catalog${catalog.contentVersion}`;
  const ordinal = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const types = settings.questionTypes;
  if (!types.length) throw new Error('No eligible Daily questions.');
  const sequence = Array.from(
    { length: DAILY_QUESTION_COUNT - 1 },
    (_, index) => {
      const slot = ordinal * (DAILY_QUESTION_COUNT - 1) + index;
      const cycle = Math.floor(slot / types.length);
      const deck = shuffle(
        types,
        createSeededRandom(`daily-types:${identity}:${cycle}`),
      );
      return deck[((slot % deck.length) + deck.length) % deck.length]!;
    },
  );
  return buildQuestionSequence(
    catalog,
    [...sequence, 'champion'],
    settings,
    createSeededRandom(`daily:${date}:${identity}`),
    undefined,
    [
      ...sequence.map((_, index) =>
        Math.floor((ordinal * 4 + index) / types.length),
      ),
      ordinal,
    ],
  );
};

export const resolveTrainingSettings = (
  catalog: PokemonCatalog,
  settings: GameSettings,
): GameSettings => {
  const resolved = getTrainingSettings(settings);
  if (!settings.difficulty) return resolved;
  const automatic = getTrainingSettings({
    ...settings,
    questionSelection: 'automatic',
  });
  const automaticQuestionTypes = automatic.questionTypes.filter((type) =>
    Boolean(
      buildQuestionType(
        createQuestionContext(
          catalog,
          automatic,
          createSeededRandom(`availability:${type}`),
        ),
        type,
      ),
    ),
  );
  return {
    ...resolved,
    automaticQuestionTypes,
    questionTypes: resolved.questionTypes.filter((type) =>
      automaticQuestionTypes.includes(type),
    ),
  };
};
