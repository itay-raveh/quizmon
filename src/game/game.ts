import { questionLabels } from './question-labels';
import {
  generations,
  answerFlows,
  timerDisplays,
  trainingModes,
  type ExperienceSettings,
  type SavedAnswerResult,
  type Modifiers,
  type PokemonCatalog,
  type QuestionCategory,
  type QuestionData,
  type QuestionType,
} from './types';
import {
  buildQuestionType,
  coreQuestionTypes,
  questionRegistry,
  questionTypes,
} from './questions/registry';
import type { Candidate, QuestionContext } from './questions/shared';
import { shuffle } from './random';
import { isChoice } from './validation';

export const defaultModifiers: Modifiers = {
  answerFlow: 'manual',
  generations: [...generations],
  questionTypes: [...questionTypes],
  reduceMotion: false,
  soundVolume: 1,
  timerDisplay: 'seconds',
  trainingMode: 'league',
};

export const getExperienceSettings = (
  settings: ExperienceSettings,
): ExperienceSettings => ({
  answerFlow: settings.answerFlow,
  reduceMotion: settings.reduceMotion,
  soundVolume: settings.soundVolume,
  timerDisplay: settings.timerDisplay,
});

export const TRAINING_QUESTION_COUNT = 10;

export const isLeagueTraining = (
  modifiers: Pick<Modifiers, 'trainingMode'>,
): boolean => modifiers.trainingMode === 'league';

export const getTrainingModifiers = (modifiers: Modifiers): Modifiers => ({
  ...modifiers,
  questionTypes: isLeagueTraining(modifiers)
    ? [...coreQuestionTypes]
    : [...modifiers.questionTypes],
});

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

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as Record<string, unknown>;
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter((generation) =>
        isChoice(generation, generations),
      )
    : [];
  const selectedQuestionTypes = Array.isArray(candidate.questionTypes)
    ? candidate.questionTypes.filter((questionType) =>
        isChoice(questionType, questionTypes),
      )
    : [];
  return {
    answerFlow: isChoice(candidate.answerFlow, answerFlows)
      ? candidate.answerFlow
      : candidate.speedrunMode === true
        ? 'instant'
        : defaultModifiers.answerFlow,
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    questionTypes:
      selectedQuestionTypes.length > 0
        ? selectedQuestionTypes
        : defaultModifiers.questionTypes,
    reduceMotion: candidate.reduceMotion === true,
    soundVolume:
      typeof candidate.soundVolume === 'number' &&
      Number.isFinite(candidate.soundVolume)
        ? Math.min(1, Math.max(0, candidate.soundVolume))
        : candidate.soundEnabled === false
          ? 0
          : defaultModifiers.soundVolume,
    timerDisplay: isChoice(candidate.timerDisplay, timerDisplays)
      ? candidate.timerDisplay
      : defaultModifiers.timerDisplay,
    trainingMode: isChoice(candidate.trainingMode, trainingModes)
      ? candidate.trainingMode
      : defaultModifiers.trainingMode,
  };
};

export const filterPokemon = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
): string[] =>
  Object.entries(catalog.pokemon)
    .filter(([, pokemon]) => modifiers.generations.includes(pokemon.generation))
    .map(([name]) => name);

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
  pool: filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon)),
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

export const getQuestionTypeLabel = (questionType: QuestionType): string =>
  questionRegistry[questionType].label;

export const getQuestionTypeDescription = (
  questionType: QuestionType,
): string => questionRegistry[questionType].description;

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
