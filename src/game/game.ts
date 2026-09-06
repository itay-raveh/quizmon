import {
  generations,
  type AnswerFlow,
  type AnswerResult,
  type Generation,
  type Modifiers,
  type PokemonCatalog,
  type QuestionCategory,
  type QuestionData,
  type QuestionPrompt,
  type QuestionType,
  type TimerDisplay,
} from './types';
import { formatPokemonName } from './format';
import {
  buildQuestionType,
  coreQuestionTypes,
  questionRegistry,
  questionTypes,
} from './questions/registry';
import type { Candidate, QuestionContext } from './questions/shared';
import { shuffle } from './random';

export { shuffle } from './random';

export const defaultModifiers: Modifiers = {
  answerFlow: 'manual',
  generations: [...generations],
  questionTypes: [...questionTypes],
  reduceMotion: false,
  soundVolume: 1,
  timerDisplay: 'seconds',
  trainingMode: 'league',
};

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
  ability: 'Ability check',
  champion: 'Champion question',
  description: 'Field notes',
  evolution: 'Evolution shift',
  identity: 'Pokédex scan',
  matchup: 'Type matchup',
  move: 'Move check',
  stat: 'Stat showdown',
  type: 'Type check',
};

const isGeneration = (value: unknown): value is Generation =>
  typeof value === 'string' && generations.includes(value as Generation);

const isQuestionType = (value: unknown): value is QuestionType =>
  typeof value === 'string' && questionTypes.includes(value as QuestionType);

const isAnswerFlow = (value: unknown): value is AnswerFlow =>
  value === 'manual' || value === 'auto' || value === 'instant';

const isTimerDisplay = (value: unknown): value is TimerDisplay =>
  value === 'hidden' || value === 'seconds' || value === 'milliseconds';

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as Partial<Modifiers> & {
    soundEnabled?: unknown;
    speedrunMode?: unknown;
  };
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter(isGeneration)
    : [];
  const selectedQuestionTypes = Array.isArray(candidate.questionTypes)
    ? candidate.questionTypes.filter(isQuestionType)
    : [];
  return {
    answerFlow: isAnswerFlow(candidate.answerFlow)
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
    timerDisplay: isTimerDisplay(candidate.timerDisplay)
      ? candidate.timerDisplay
      : defaultModifiers.timerDisplay,
    trainingMode:
      candidate.trainingMode === 'league' || candidate.trainingMode === 'custom'
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

export const buildQuestions = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number = Math.random,
  requestedCount = TRAINING_QUESTION_COUNT,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const count = getQuestionCount(pool.length, requestedCount);
  const context: QuestionContext = { catalog, pool, random, used: new Set() };
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
    let question: QuestionData | undefined;
    for (const questionType of candidates) {
      question = buildQuestionType(context, questionType);
      if (question) break;
    }
    if (!question) continue;
    questions.push({ ...question, id: `${question.id}:${index}` });
  }

  return questions;
};

export const buildQuestionSequence = (
  catalog: PokemonCatalog,
  questionSequence: readonly (QuestionType | 'champion')[],
  modifiers: Modifiers,
  random: () => number,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const context: QuestionContext = { catalog, pool, random, used: new Set() };

  return questionSequence.map((questionType, index) => {
    let question = buildQuestionType(context, questionType);

    if (!question && questionType !== 'champion') {
      for (const fallbackType of shuffle(
        modifiers.questionTypes.filter(
          (candidate) => candidate !== questionType,
        ),
        random,
      )) {
        question = buildQuestionType(context, fallbackType);
        if (question) break;
      }
    }

    if (!question) {
      throw new Error(`Unable to build ${questionType} question`);
    }

    return { ...question, id: `${question.id}:${index}` };
  });
};

export const getAnswerPoints = (
  question: QuestionData,
  correct: boolean,
  assistsUsed = 0,
): number => {
  if (!correct) return 0;
  if (question.category !== 'champion') return 1_000;
  return [1_000, 750, 500, 250][Math.max(0, Math.min(3, assistsUsed))] ?? 250;
};

export const getKnowledgePoints = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + answer.points, 0);

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

export const getSpeedBonus = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + (answer.speedBonus ?? 0), 0);

export const getMasteryBonus = (answers: readonly AnswerResult[]): number => {
  if (answers.length === 0) return 0;
  const knowledgePoints = getKnowledgePoints(answers);
  return Math.round(
    (knowledgePoints * knowledgePoints) / (answers.length * 1_000),
  );
};

export const SCORE_VERSION = 2;

export const calculateScore = (answers: readonly AnswerResult[]): number =>
  getKnowledgePoints(answers) +
  getSpeedBonus(answers) +
  getMasteryBonus(answers);

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];

export const getQuestionTypeLabel = (questionType: QuestionType): string =>
  questionRegistry[questionType].label;

export const getQuestionTypeDescription = (
  questionType: QuestionType,
): string => questionRegistry[questionType].description;

export const getCorrectOptions = (question: QuestionData): string[] =>
  question.answer.correctOptions;

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

export const getQuestionPromptText = (prompt: QuestionPrompt): string =>
  prompt.kind === 'text'
    ? prompt.text
    : `${prompt.before}${formatPokemonName(prompt.name)}${prompt.after}`;

export const getResponseTimeSeconds = (
  answers: readonly AnswerResult[],
): number => Math.floor(getResponseTimeMilliseconds(answers) / 1_000);

export const getResponseTimeMilliseconds = (
  answers: readonly AnswerResult[],
): number =>
  answers.reduce(
    (total, answer) => total + (answer.responseMilliseconds ?? 0),
    0,
  );

export const formatDuration = (elapsedSeconds: number): string => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

export const formatDurationMilliseconds = (
  elapsedMilliseconds: number,
): string =>
  `${formatDuration(Math.floor(elapsedMilliseconds / 1000))}.${String(
    Math.floor(elapsedMilliseconds % 1000),
  ).padStart(3, '0')}`;
