import { createSeededRandom, shuffle } from '../../lib/random.ts';
import type { PokemonCatalog } from '../pokemon/types.ts';
import {
  TRAINING_QUESTION_COUNT,
  filterPokemon,
  getTrainingSettings,
} from '../settings/game-settings.ts';
import type { ExperienceSettings, GameSettings } from '../settings/types.ts';
import { DAILY_QUESTION_COUNT } from './daily.ts';
import {
  LEAGUE_QUESTION_COUNT,
  getLeagueSettings,
  leagueStages,
} from './league.ts';
import { type QuestionHistory } from './history.ts';
import type { QuestionContext } from './questions/context.ts';
import { questionTypes } from './questions/definitions.ts';
import { buildQuestionType } from './questions/registry.ts';
import type { QuestionData, QuestionType } from './types.ts';
import { getQuestionVariant, isActiveQuestionType } from './variants.ts';

const createQuestionContext = (
  catalog: PokemonCatalog,
  settings: GameSettings,
  random: () => number,
  history?: QuestionHistory,
): QuestionContext => ({
  catalog,
  level: settings.level,
  generations: settings.generations,
  pool: filterPokemon(catalog, settings),
  random,
  used: new Set(),
  history,
});

const buildFirstAvailableQuestion = (
  context: QuestionContext,
  types: readonly (QuestionType | 'champion')[],
): QuestionData | undefined => {
  for (const type of types) {
    const question = buildQuestionType(context, type);
    if (question) return question;
  }
  return undefined;
};

export const orderTrainingQuestionTypes = (
  types: readonly QuestionType[],
  previousRoundTypes: ReadonlySet<QuestionType>,
  random: () => number,
): QuestionType[] => {
  if (!previousRoundTypes.size) return shuffle(types, random);
  const remaining = [...types];
  const ordered: QuestionType[] = [];
  while (remaining.length) {
    const totalWeight = remaining.reduce(
      (total, type) => total + (previousRoundTypes.has(type) ? 1 : 2),
      0,
    );
    let draw = random() * totalWeight;
    const index = remaining.findIndex(
      (type) => (draw -= previousRoundTypes.has(type) ? 1 : 2) < 0,
    );
    ordered.push(remaining.splice(index, 1)[0]!);
  }
  return ordered;
};

export const buildQuestions = (
  catalog: PokemonCatalog,
  settings: GameSettings,
  random: () => number,
  requestedCount = TRAINING_QUESTION_COUNT,
  history?: QuestionHistory,
  previousRoundTypes: ReadonlySet<QuestionType> = new Set(),
): QuestionData[] => {
  const context = createQuestionContext(catalog, settings, random, history);
  const count = settings.level && context.pool.length ? requestedCount : 0;
  const questions: QuestionData[] = [];

  for (let index = 0; index < count; index += 1) {
    const question = buildFirstAvailableQuestion(
      context,
      orderTrainingQuestionTypes(
        settings.questionTypes,
        previousRoundTypes,
        random,
      ),
    );
    if (!question) continue;
    questions.push({ ...question, id: `${question.id}:${index}` });
  }

  return questions;
};

const buildQuestionSequence = (
  catalog: PokemonCatalog,
  questionSequence: readonly (QuestionType | 'champion')[],
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

export const buildLeagueQuestions = (
  catalog: PokemonCatalog,
  seed: string,
  experience: ExperienceSettings,
  history?: QuestionHistory,
): QuestionData[] => {
  const settings = getLeagueSettings(experience);
  const context = createQuestionContext(
    catalog,
    settings,
    createSeededRandom(`quizmon-league:${seed}`),
    history,
  );
  const usedTypes = new Set<QuestionType>();
  const questions: QuestionData[] = [];

  for (const stage of leagueStages) {
    context.level = stage.level;
    const candidates = shuffle(
      questionTypes.filter(
        (type) =>
          isActiveQuestionType(type) &&
          !usedTypes.has(type) &&
          getQuestionVariant(type, stage.level) &&
          (stage.level !== 4 || !getQuestionVariant(type, 3)),
      ),
      createSeededRandom(`quizmon-league-types:${seed}:${stage.level}`),
    );
    const slots = stage.level === 5 ? 2 : 3;
    for (let slot = 0; slot < slots; slot += 1) {
      const question = buildFirstAvailableQuestion(context, candidates);
      if (!question || question.questionType === 'champion') {
        throw new Error(`Unable to build Level ${stage.level} League question`);
      }
      usedTypes.add(question.questionType);
      candidates.splice(candidates.indexOf(question.questionType), 1);
      questions.push({ ...question, id: `${question.id}:${questions.length}` });
    }
  }

  context.level = 5;
  const finale = buildQuestionType(context, 'champion');
  if (!finale) throw new Error('Unable to build Champion question');
  questions.push({ ...finale, id: `${finale.id}:${questions.length}` });

  if (questions.length !== LEAGUE_QUESTION_COUNT)
    throw new Error(
      `Quizmon League requires ${LEAGUE_QUESTION_COUNT} questions`,
    );

  return questions;
};

export const buildDailyQuestions = (
  catalog: PokemonCatalog,
  date: string,
  settings: GameSettings,
): QuestionData[] => {
  const ordinal = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const types = settings.questionTypes;
  if (!types.length) throw new Error('No eligible Daily questions.');
  const sequence = Array.from(
    { length: DAILY_QUESTION_COUNT - 1 },
    (_, index) => {
      const slot = ordinal * (DAILY_QUESTION_COUNT - 1) + index;
      const cycle = Math.floor(slot / types.length);
      const deck = shuffle(types, createSeededRandom(`daily-types:${cycle}`));
      return deck[((slot % deck.length) + deck.length) % deck.length]!;
    },
  );
  return buildQuestionSequence(
    catalog,
    [...sequence, 'champion'],
    settings,
    createSeededRandom(`daily:${date}`),
    undefined,
    [
      ...sequence.map((_, index) =>
        Math.floor((ordinal * 4 + index) / types.length),
      ),
      ordinal,
    ],
  );
};

export const getAvailableTrainingQuestionTypes = (
  catalog: PokemonCatalog,
  settings: GameSettings,
): QuestionType[] =>
  settings.level
    ? questionTypes.filter((type) =>
        Boolean(
          buildQuestionType(
            createQuestionContext(
              catalog,
              settings,
              createSeededRandom(`availability:${type}`),
            ),
            type,
          ),
        ),
      )
    : [];

export const resolveTrainingSettings = (
  catalog: PokemonCatalog,
  settings: GameSettings,
): GameSettings => {
  const resolved = getTrainingSettings(settings);
  if (!settings.level) return resolved;
  const available = getAvailableTrainingQuestionTypes(catalog, resolved);
  return {
    ...resolved,
    automaticQuestionTypes: available.filter(isActiveQuestionType),
    questionTypes: resolved.questionTypes.filter((type) =>
      available.includes(type),
    ),
  };
};
