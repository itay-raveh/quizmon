import {
  generations,
  type AnswerResult,
  type Generation,
  type Modifiers,
  type PokemonCatalog,
  type QuestionCategory,
  type QuestionData,
  type QuestionPrompt,
  type QuestionType,
} from './types';
import { formatPokemonName } from './format';
import {
  buildQuestionType,
  questionRegistry,
  questionTypes,
} from './questions/registry';
import type { Candidate, QuestionContext } from './questions/shared';
import { shuffle } from './random';

export { shuffle } from './random';

export const defaultModifiers: Modifiers = {
  generations: [...generations],
  questionTypes: [...questionTypes],
  soundEnabled: true,
  limit: 10,
  speedrunMode: false,
  trainingMode: 'league',
};

export const isLeagueTraining = (
  modifiers: Pick<Modifiers, 'trainingMode'>,
): boolean => modifiers.trainingMode === 'league';

export const getTrainingModifiers = (modifiers: Modifiers): Modifiers => ({
  ...modifiers,
  limit: 10,
  questionTypes: isLeagueTraining(modifiers)
    ? [...questionTypes]
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

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as Partial<Modifiers>;
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter(isGeneration)
    : [];
  const selectedQuestionTypes = Array.isArray(candidate.questionTypes)
    ? candidate.questionTypes.filter(isQuestionType)
    : [];
  const legacyLeagueTraining =
    candidate.limit === 10 &&
    selectedQuestionTypes.length === questionTypes.length &&
    questionTypes.every((questionType) =>
      selectedQuestionTypes.includes(questionType),
    );
  const limit = Number.isFinite(candidate.limit)
    ? Math.max(1, Math.trunc(candidate.limit as number))
    : defaultModifiers.limit;

  return {
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    questionTypes:
      selectedQuestionTypes.length > 0
        ? selectedQuestionTypes
        : defaultModifiers.questionTypes,
    soundEnabled: candidate.soundEnabled !== false,
    limit,
    speedrunMode: candidate.speedrunMode === true,
    trainingMode:
      candidate.trainingMode === 'league' || candidate.trainingMode === 'custom'
        ? candidate.trainingMode
        : legacyLeagueTraining
          ? 'league'
          : 'custom',
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
  modifiers: Modifiers,
): number => {
  if (availableCount < 1) return 0;
  return Math.min(Math.max(1, modifiers.limit), availableCount);
};

export const buildQuestions = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number = Math.random,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const count = getQuestionCount(pool.length, modifiers);
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
        questionTypes.filter((candidate) => candidate !== questionType),
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
): number =>
  Math.floor(
    answers.reduce(
      (total, answer) => total + (answer.responseMilliseconds ?? 0),
      0,
    ) / 1_000,
  );

export const formatDuration = (elapsedSeconds: number): string => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};
