import {
  isAnswerObservation,
  observationCorrect,
} from '../quiz/answer-observation.ts';
import { getTrainingScoreMultipliers } from '../quiz/score-multipliers.ts';
import { isAnswerSubject } from '../quiz/subject.ts';
import { isDailyTrack, type DailyTrack } from '../quiz/daily-track.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import { questionCategories } from '../quiz/types.ts';
import { formGroups, generations } from '../pokemon/types.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../quiz/scoring.ts';
import type {
  AnswerObservation,
  AnswerResult,
  AnswerSubject,
  GameResult,
  QuestionCategory,
  QuestionType,
} from '../quiz/types.ts';
import type { TrainingConfig, RoundCompletion } from './progress.ts';
import {
  isDailyDate,
  isChoice,
  isRecord,
  isUtcTimestamp,
  isUuid,
} from '../../lib/validation.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import { gameVersions } from '../versions.ts';

type RoundMode = 'training' | 'daily' | 'league';

interface ArchivedQuestion {
  id: string;
  prompt: Record<string, unknown>;
  interaction: AnswerObservation['interaction'];
  options: string[];
  expected: string[];
  selected: string[];
  labels?: Record<string, string>;
  clues?: AnswerObservation['clues'];
  supplied_clues?: string[];
  context?: string;
  difficulty?: number;
}

interface RoundAnswer {
  question: ArchivedQuestion;
  subject: AnswerSubject;
  category: QuestionCategory;
  question_type: QuestionType | 'champion';
  clues_used: number;
  response_ms: number;
  unassisted_search: boolean;
}

export interface RoundData {
  config: {
    training_mode: TrainingConfig['trainingMode'];
    difficulty?: TrainingConfig['difficulty'];
    question_selection?: TrainingConfig['questionSelection'];
    generations: TrainingConfig['generations'];
    form_groups: NonNullable<TrainingConfig['formGroups']>;
    question_types: TrainingConfig['questionTypes'];
    auto_types: NonNullable<TrainingConfig['automaticQuestionTypes']>;
    daily_track?: DailyTrack;
  };
  answers: RoundAnswer[];
  found: string[];
  victory: { trainer_name: string; pokemon: string[] } | null;
}

export interface RoundFact {
  id: string;
  mode: RoundMode;
  day: string | null;
  puzzle_id: string | null;
  started_on: string | null;
  completed_at: string;
  credited: boolean;
  data: RoundData;
}

const archiveQuestion = (observation: AnswerObservation): ArchivedQuestion => ({
  id: observation.questionId,
  prompt:
    observation.prompt.kind === 'text'
      ? {
          kind: 'text',
          text: observation.prompt.text,
          ...(observation.prompt.supportingText
            ? { supporting_text: observation.prompt.supportingText }
            : {}),
        }
      : {
          kind: 'pokemon',
          name: observation.prompt.name,
          before: observation.prompt.before,
          after: observation.prompt.after,
          dex_number: observation.prompt.dexNumber,
          ...(observation.prompt.supportingText
            ? { supporting_text: observation.prompt.supportingText }
            : {}),
        },
  interaction: observation.interaction,
  options: observation.options,
  expected: observation.expected,
  selected: observation.selected,
  ...(observation.labels ? { labels: observation.labels } : {}),
  ...(observation.clues ? { clues: observation.clues } : {}),
  ...(observation.suppliedClues
    ? { supplied_clues: observation.suppliedClues }
    : {}),
  ...(observation.context ? { context: observation.context } : {}),
  ...(observation.difficulty ? { difficulty: observation.difficulty } : {}),
});

const liveQuestion = (question: ArchivedQuestion): AnswerObservation => {
  const { supporting_text, dex_number, ...prompt } = question.prompt;
  return {
    questionId: question.id,
    prompt: {
      ...prompt,
      ...(supporting_text === undefined
        ? {}
        : { supportingText: supporting_text }),
      ...(dex_number === undefined ? {} : { dexNumber: dex_number }),
    } as AnswerObservation['prompt'],
    interaction: question.interaction,
    options: question.options,
    expected: question.expected,
    selected: question.selected,
    ...(question.labels ? { labels: question.labels } : {}),
    ...(question.clues ? { clues: question.clues } : {}),
    ...(question.supplied_clues
      ? { suppliedClues: question.supplied_clues }
      : {}),
    ...(question.context ? { context: question.context } : {}),
    ...(question.difficulty
      ? { difficulty: question.difficulty as AnswerObservation['difficulty'] }
      : {}),
  };
};

export function archiveCompletion(
  completion: RoundCompletion,
  credited = true,
  startedOn = completion.completedAt.slice(0, 10),
): RoundFact {
  return {
    id: completion.completionId,
    mode: completion.mode,
    day: completion.dailyDate,
    puzzle_id: completion.mode === 'daily' ? completion.result.puzzleId! : null,
    started_on: completion.mode === 'daily' ? startedOn : null,
    completed_at: completion.completedAt,
    credited,
    data: {
      config: {
        training_mode: completion.training.trainingMode,
        ...(completion.training.difficulty
          ? { difficulty: completion.training.difficulty }
          : {}),
        ...(completion.training.questionSelection
          ? { question_selection: completion.training.questionSelection }
          : {}),
        generations: completion.training.generations,
        form_groups:
          completion.training.formGroups ?? defaultGameSettings.formGroups,
        question_types: completion.training.questionTypes,
        auto_types: completion.training.automaticQuestionTypes ?? [],
        ...(completion.result.dailyTrack
          ? { daily_track: completion.result.dailyTrack }
          : {}),
      },
      answers: completion.result.answers.map((answer) => ({
        question: archiveQuestion(answer.observation!),
        subject: {
          kind: answer.subject.kind,
          ...(answer.subject.name === undefined
            ? {}
            : { name: answer.subject.name }),
          ...(answer.subject.generation === undefined
            ? {}
            : { generation: answer.subject.generation }),
        },
        category: answer.category,
        question_type: answer.questionType,
        clues_used: answer.cluesUsed,
        response_ms: answer.responseMilliseconds!,
        unassisted_search: answer.unassistedSearch ?? answer.cluesUsed === 0,
      })),
      found: completion.discoveries,
      victory: completion.victory
        ? {
            trainer_name: completion.victory.trainerName,
            pokemon: completion.victory.pokemon,
          }
        : null,
    },
  };
}

export function scoreRound(
  round: Pick<RoundFact, 'mode' | 'data' | 'puzzle_id'>,
): GameResult {
  const answers: AnswerResult[] = round.data.answers.map((answer) => {
    const observation = liveQuestion(answer.question);
    const correct = observationCorrect(observation);
    const points = getAnswerPoints(answer, correct, answer.clues_used);
    return {
      observation,
      subject: answer.subject,
      category: answer.category,
      questionType: answer.question_type,
      cluesUsed: answer.clues_used,
      responseMilliseconds: answer.response_ms,
      unassistedSearch: answer.unassisted_search,
      correct,
      points,
      speedBonus: getSpeedBonusPoints(points, answer.response_ms),
    };
  });
  const config = round.data.config;
  const multipliers =
    round.mode === 'training'
      ? getTrainingScoreMultipliers(
          {
            difficulty: config.difficulty,
            generations: config.generations,
            formGroups: config.form_groups,
            questionTypes: config.question_types,
          },
          answers,
        )
      : undefined;
  return {
    answers,
    correctCount: answers.filter((answer) => answer.correct).length,
    questionCount:
      round.mode === 'training' ? 10 : round.mode === 'daily' ? 5 : 15,
    ...getResponseTime(answers),
    score: calculateScore(answers, multipliers),
    ...(multipliers ? { scoreMultipliers: multipliers } : {}),
    ...(round.mode === 'daily'
      ? {
          ...(config.daily_track
            ? { dailyTrack: config.daily_track }
            : config.difficulty
              ? {
                  dailyTrack: {
                    difficulty: config.difficulty,
                    scope:
                      config.generations.length === 1 &&
                      config.generations[0] === 'I'
                        ? ('gen-i' as const)
                        : ('all' as const),
                  },
                }
              : {}),
          puzzleId: round.puzzle_id!,
        }
      : {}),
    contentVersion: gameVersions.content,
    scoreVersion: gameVersions.score,
  };
}

export function validateRoundFact(value: unknown): value is RoundFact {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isChoice(value.mode, ['training', 'daily', 'league']) ||
    !isUtcTimestamp(value.completed_at) ||
    typeof value.credited !== 'boolean' ||
    !isRecord(value.data) ||
    !isRecord(value.data.config) ||
    !Array.isArray(value.data.answers) ||
    !Array.isArray(value.data.found)
  )
    return false;
  if (value.mode === 'daily') {
    if (
      !isDailyDate(value.day) ||
      !isDailyDate(value.started_on) ||
      typeof value.puzzle_id !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.puzzle_id)
    )
      return false;
  } else if (
    value.day !== null ||
    value.puzzle_id !== null ||
    value.started_on !== null ||
    !value.credited
  )
    return false;
  const count =
    value.mode === 'training' ? 10 : value.mode === 'daily' ? 5 : 15;
  if (
    !value.data.answers.length ||
    value.data.answers.length > count ||
    (value.mode !== 'league' && value.data.answers.length !== count)
  )
    return false;
  const config = value.data.config;
  const strings = (items: unknown, max = 100): items is string[] =>
    Array.isArray(items) &&
    items.length <= max &&
    items.every(
      (item) =>
        typeof item === 'string' && item.length > 0 && item.length <= 200,
    ) &&
    new Set(items).size === items.length;
  if (
    !isChoice(config.training_mode, ['league', 'custom']) ||
    (config.difficulty !== undefined &&
      (!Number.isInteger(config.difficulty) ||
        Number(config.difficulty) < 1 ||
        Number(config.difficulty) > 5)) ||
    (config.question_selection !== undefined &&
      config.question_selection !== 'automatic' &&
      config.question_selection !== 'custom') ||
    !strings(config.generations, 20) ||
    !config.generations.length ||
    !config.generations.every((name: string) =>
      (generations as readonly string[]).includes(name),
    ) ||
    !strings(config.form_groups, 20) ||
    !config.form_groups.length ||
    !config.form_groups.every((name: string) =>
      (formGroups as readonly string[]).includes(name),
    ) ||
    !strings(config.question_types) ||
    !config.question_types.length ||
    !config.question_types.every((name: string) =>
      (questionTypes as readonly string[]).includes(name),
    ) ||
    !strings(config.auto_types) ||
    !config.auto_types.every((name: string) =>
      (questionTypes as readonly string[]).includes(name),
    ) ||
    (config.daily_track !== undefined && !isDailyTrack(config.daily_track)) ||
    (value.mode !== 'daily' && config.daily_track !== undefined) ||
    !strings(value.data.found, 2000) ||
    !value.data.found.every((name: string) =>
      Object.hasOwn(pokemonGenerations, name),
    )
  )
    return false;
  const victory = value.data.victory;
  if (
    victory !== null &&
    (!isRecord(victory) ||
      typeof victory.trainer_name !== 'string' ||
      victory.trainer_name.length > 20 ||
      !strings(victory.pokemon, 20) ||
      !victory.pokemon.length)
  )
    return false;
  if (value.mode !== 'league' && victory !== null) return false;
  return value.data.answers.every((entry: unknown) => {
    if (!isRecord(entry) || !isRecord(entry.question)) return false;
    const q = entry.question;
    if (
      typeof q.id !== 'string' ||
      !isRecord(q.prompt) ||
      !strings(q.options) ||
      !strings(q.expected) ||
      !strings(q.selected)
    )
      return false;
    return (
      isAnswerObservation(liveQuestion(q as unknown as ArchivedQuestion)) &&
      isAnswerSubject(entry.subject) &&
      isChoice(entry.category, questionCategories) &&
      (entry.question_type === 'champion' ||
        isChoice(entry.question_type, questionTypes)) &&
      Number.isSafeInteger(entry.clues_used) &&
      Number(entry.clues_used) >= 0 &&
      Number(entry.clues_used) <= 4 &&
      Number.isSafeInteger(entry.response_ms) &&
      Number(entry.response_ms) >= 0 &&
      Number(entry.response_ms) <= 86_400_000 &&
      typeof entry.unassisted_search === 'boolean'
    );
  });
}
