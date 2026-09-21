import { trainerSpecialtyDetails } from '../player/trainer-progression.ts';
import {
  isAnswerObservation,
  observationCorrect,
} from '../quiz/answer-observation.ts';
import { isAnswerSubject } from '../quiz/subject.ts';
import {
  isScoreMultipliers,
  getTrainingScoreMultipliers,
} from '../quiz/score-multipliers.ts';
import { getUnifiedScoreKey } from '../quiz/scoring.ts';
import { formatVersions, gameVersions } from '../versions.ts';
import { completionCompatibility } from './compatibility.ts';
import {
  isDailyDate,
  isRecord as isObject,
  isUtcTimestamp,
  isUuid as uuid,
} from '../../lib/validation.ts';
import { addResultToProgress } from '../player/progress.ts';
import { normalizeResults } from '../player/results.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { formGroups, generations } from '../pokemon/types.ts';
import { isDailyTrack } from '../quiz/daily-track.ts';
import { isDifficulty } from '../quiz/difficulty.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import { isRoundRules } from '../quiz/round-rules.ts';
import {
  calculateScore,
  getAnswerPoints,
  getResponseTime,
  getSpeedBonusPoints,
} from '../quiz/scoring.ts';
import {
  questionCategories,
  type AnswerResult,
  type GameResult,
} from '../quiz/types.ts';
import {
  defaultGameSettings,
  getTrainingSettings,
} from '../settings/game-settings.ts';
import type { GameSettings } from '../settings/types.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../settings/types.ts';
export { isUuid as uuid } from '../../lib/validation.ts';

export const versions = {
  ...gameVersions,
  payload: formatVersions.action,
  record: formatVersions.completion,
} as const;
export const utcDay = (timestamp = new Date().toISOString()) =>
  timestamp.slice(0, 10);
const member = <T extends string>(
  value: unknown,
  options: readonly T[],
): value is T => typeof value === 'string' && options.includes(value as T);
const integer = (
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= max;
const pokemonKey = (value: unknown): value is keyof typeof pokemonGenerations =>
  typeof value === 'string' && Object.hasOwn(pokemonGenerations, value);
const keys = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= Object.keys(pokemonGenerations).length &&
  value.every(pokemonKey) &&
  new Set(value).size === value.length;

export type TrainingConfig = Pick<
  GameSettings,
  | 'trainingMode'
  | 'generations'
  | 'questionTypes'
  | 'difficulty'
  | 'questionSelection'
  | 'automaticQuestionTypes'
> & { formGroups?: GameSettings['formGroups'] };
export const trainingConfig = (settings: GameSettings): TrainingConfig => ({
  trainingMode: settings.trainingMode,
  generations: [...settings.generations],
  questionTypes: [...settings.questionTypes],
  formGroups: [...settings.formGroups],
  ...(settings.difficulty === undefined
    ? {}
    : { difficulty: settings.difficulty }),
  ...(settings.questionSelection === undefined
    ? {}
    : { questionSelection: settings.questionSelection }),
  automaticQuestionTypes: [
    ...(settings.automaticQuestionTypes ??
      getTrainingSettings({ ...settings, questionSelection: 'automatic' })
        .questionTypes),
  ],
});
export const trainingBestKey = (round: RoundCompletion) =>
  getUnifiedScoreKey(round.result);
function validTraining(value: unknown): value is TrainingConfig {
  return (
    isObject(value) &&
    member(value.trainingMode, trainingModes) &&
    (value.difficulty === undefined || isDifficulty(value.difficulty)) &&
    (value.questionSelection === undefined ||
      member(value.questionSelection, ['automatic', 'custom'])) &&
    (value.formGroups === undefined ||
      (Array.isArray(value.formGroups) &&
        value.formGroups.length > 0 &&
        value.formGroups.every((v) => member(v, formGroups)) &&
        new Set(value.formGroups).size === value.formGroups.length)) &&
    (value.automaticQuestionTypes === undefined ||
      (Array.isArray(value.automaticQuestionTypes) &&
        value.automaticQuestionTypes.length > 0 &&
        value.automaticQuestionTypes.every((v) => member(v, questionTypes)) &&
        new Set(value.automaticQuestionTypes).size ===
          value.automaticQuestionTypes.length)) &&
    Array.isArray(value.generations) &&
    value.generations.length > 0 &&
    value.generations.length <= generations.length &&
    value.generations.every((v) => member(v, generations)) &&
    new Set(value.generations).size === value.generations.length &&
    Array.isArray(value.questionTypes) &&
    value.questionTypes.length > 0 &&
    value.questionTypes.length <= questionTypes.length &&
    value.questionTypes.every((v) => member(v, questionTypes)) &&
    new Set(value.questionTypes).size === value.questionTypes.length
  );
}

export interface RoundCompletion {
  recordVersion: 1;
  completionId: string;
  datasetId: string;
  contentVersion: number;
  scoreVersion: number;
  progressVersion: number;
  generatorVersion: number;
  mode: 'training' | 'daily' | 'league';
  dailyDate: string | null;
  training: TrainingConfig;
  completedAt: string;
  result: Omit<GameResult, 'answers'> & {
    answers: AnswerResult[];
    elapsedMilliseconds: number;
    scoreVersion: number;
  };
  discoveries: string[];
  victory: { trainerName: string; pokemon: string[] } | null;
}
export interface Contribution {
  rounds: number;
  correctAnswers: number;
  points: number;
  correctCategories: Record<string, number>;
  correctGenerations: Record<string, number>;
  correctQuestionTypes: Record<string, number>;
  championAnswersWithoutClues: number;
  masteryRounds: number;
  quickAttackRounds: number;
  correctPokemon: string[];
  discoveries: string[];
  leagueCompleted: boolean;
}
export const emptyContribution = (): Contribution => ({
  rounds: 0,
  correctAnswers: 0,
  points: 0,
  correctCategories: {},
  correctGenerations: {},
  correctQuestionTypes: {},
  championAnswersWithoutClues: 0,
  masteryRounds: 0,
  quickAttackRounds: 0,
  correctPokemon: [],
  discoveries: [],
  leagueCompleted: false,
});
export function combine(
  base: Contribution,
  change: Contribution,
): Contribution {
  const merge = (a: Record<string, number>, b: Record<string, number>) => {
    const result = { ...a };
    for (const [key, n] of Object.entries(b))
      result[key] = (result[key] ?? 0) + n;
    return result;
  };
  return {
    rounds: base.rounds + change.rounds,
    correctAnswers: base.correctAnswers + change.correctAnswers,
    points: base.points + change.points,
    correctCategories: merge(base.correctCategories, change.correctCategories),
    correctGenerations: merge(
      base.correctGenerations,
      change.correctGenerations,
    ),
    correctQuestionTypes: merge(
      base.correctQuestionTypes,
      change.correctQuestionTypes,
    ),
    championAnswersWithoutClues:
      base.championAnswersWithoutClues + change.championAnswersWithoutClues,
    masteryRounds: base.masteryRounds + change.masteryRounds,
    quickAttackRounds: base.quickAttackRounds + change.quickAttackRounds,
    correctPokemon: [
      ...new Set([...base.correctPokemon, ...change.correctPokemon]),
    ].sort(),
    discoveries: [
      ...new Set([...base.discoveries, ...change.discoveries]),
    ].sort(),
    leagueCompleted: base.leagueCompleted || change.leagueCompleted,
  };
}
export function contribution(
  completion: RoundCompletion,
  eligible = true,
): Contribution {
  const next = emptyContribution();
  next.discoveries = [...completion.discoveries];
  if (!eligible) return next;
  next.rounds = 1;
  next.points = completion.result.score;
  const progress = addResultToProgress(
    normalizeResults(null).progress,
    completion.result,
    completion.mode === 'daily'
      ? { kind: 'daily', date: completion.dailyDate! }
      : { kind: completion.mode },
    {
      ...defaultGameSettings,
      ...completion.training,
      formGroups:
        completion.training.formGroups ?? defaultGameSettings.formGroups,
    },
  );
  next.correctAnswers = completion.result.correctCount;
  next.correctCategories = progress.correctCategories;
  next.correctGenerations = progress.correctGenerations;
  next.correctQuestionTypes = progress.correctQuestionTypes;
  next.championAnswersWithoutClues = progress.championAnswersWithoutClues;
  next.masteryRounds = progress.masteryRounds;
  next.quickAttackRounds = progress.quickAttackRounds;
  next.correctPokemon = [...progress.correctPokemon].sort();
  next.leagueCompleted =
    completion.mode === 'league' && completion.victory !== null;
  return next;
}

export function validateCompletion(value: unknown): string | null {
  if (!isObject(value) || !uuid(value.completionId) || !uuid(value.datasetId))
    return 'invalid_identity';
  if (value.recordVersion !== formatVersions.completion)
    return 'unsupported_version';
  const compatibility = completionCompatibility(value);
  if (!compatibility) return 'unsupported_version';
  const knownPokemon = (v: unknown): v is string =>
    typeof v === 'string' && Object.hasOwn(compatibility.pokemonGenerations, v);
  const knownKeys = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.length <= Object.keys(compatibility.pokemonGenerations).length &&
    v.every(knownPokemon) &&
    new Set(v).size === v.length;
  if (
    !member(value.mode, ['training', 'daily', 'league']) ||
    !validTraining(value.training) ||
    !isUtcTimestamp(value.completedAt) ||
    !knownKeys(value.discoveries)
  )
    return 'invalid_completion';
  if (
    (value.mode === 'daily' && !isDailyDate(value.dailyDate)) ||
    (value.mode !== 'daily' && value.dailyDate !== null)
  )
    return 'invalid_mode';
  const result = value.result;
  const total = compatibility.questionCount;
  if (
    !isObject(result) ||
    (value.mode === 'daily' &&
      (typeof result.puzzleId !== 'string' ||
        !/^[a-f0-9]{64}$/.test(result.puzzleId))) ||
    (value.mode !== 'daily' && result.puzzleId !== undefined) ||
    result.questionCount !== total ||
    result.contentVersion !== value.contentVersion ||
    result.scoreVersion !== value.scoreVersion ||
    !Array.isArray(result.answers) ||
    !result.answers.length ||
    result.answers.length > total ||
    (value.mode !== 'league' && result.answers.length !== total)
  )
    return 'invalid_result';
  if (
    result.rules !== undefined &&
    (!isRoundRules(result.rules) ||
      result.rules.difficulty !== value.training.difficulty ||
      !value.training.formGroups ||
      JSON.stringify([...result.rules.formGroups].sort()) !==
        JSON.stringify([...value.training.formGroups].sort()) ||
      JSON.stringify([...result.rules.generations].sort()) !==
        JSON.stringify([...value.training.generations].sort()) ||
      JSON.stringify([...result.rules.questionTypes].sort()) !==
        JSON.stringify([...value.training.questionTypes].sort()))
  )
    return 'invalid_rules';
  if (
    result.dailyTrack !== undefined &&
    (value.mode !== 'daily' ||
      !isDailyTrack(result.dailyTrack) ||
      result.dailyTrack.difficulty !== result.rules?.difficulty)
  )
    return 'invalid_daily_track';
  for (const answer of result.answers as unknown[]) {
    const subject = isObject(answer) ? answer.subject : undefined;
    if (
      !isObject(answer) ||
      !isAnswerObservation(answer.observation) ||
      observationCorrect(answer.observation) !== answer.correct ||
      !isAnswerSubject(subject) ||
      (subject.kind === 'pokemon' && !knownPokemon(subject.name)) ||
      !member(answer.category, questionCategories) ||
      !member(answer.questionType, [...questionTypes, 'champion']) ||
      !member(subject.generation, generations) ||
      typeof answer.correct !== 'boolean' ||
      (answer.unassistedSearch !== undefined &&
        typeof answer.unassistedSearch !== 'boolean') ||
      (answer.unassistedSearch === true &&
        (answer.questionType !== 'champion' || answer.cluesUsed !== 0)) ||
      (result.rules !== undefined &&
        answer.questionType === 'champion' &&
        typeof answer.unassistedSearch !== 'boolean') ||
      // Showing choices counts as an assist alongside the three clues.
      !integer(answer.cluesUsed, 4) ||
      !integer(answer.responseMilliseconds, 86_400_000)
    )
      return 'invalid_answer';
    if (
      (subject.kind === 'pokemon' &&
        compatibility.pokemonGenerations[subject.name!] !==
          subject.generation) ||
      (answer.questionType === 'champion') !==
        (answer.category === 'champion') ||
      (answer.questionType !== 'champion' && answer.cluesUsed !== 0)
    )
      return 'invalid_answer';
    const points = getAnswerPoints(
      { category: answer.category },
      answer.correct,
      answer.cluesUsed,
      compatibility.scoring,
    );
    if (
      answer.points !== points ||
      answer.speedBonus !==
        getSpeedBonusPoints(
          points,
          answer.responseMilliseconds,
          compatibility.scoring,
        )
    )
      return 'invalid_score';
    if (
      value.mode === 'training' &&
      (answer.questionType === 'champion' ||
        !value.training.questionTypes.includes(answer.questionType) ||
        !value.training.generations.includes(subject.generation))
    )
      return 'invalid_configuration';
  }
  if (
    value.mode === 'training' &&
    getTrainingScoreMultipliers(value.training) &&
    !result.scoreMultipliers
  )
    return 'invalid_score';
  if (
    result.scoreMultipliers !== undefined &&
    (value.mode !== 'training' ||
      !isScoreMultipliers(result.scoreMultipliers) ||
      JSON.stringify(result.scoreMultipliers) !==
        JSON.stringify(getTrainingScoreMultipliers(value.training)))
  )
    return 'invalid_score';
  const answers = result.answers as AnswerResult[];
  if (
    value.mode !== 'training' &&
    answers.some(
      (answer, index) =>
        (answer.questionType === 'champion') !== (index === total - 1),
    )
  )
    return 'invalid_champion_position';
  if (value.mode === 'league') {
    const failedAt = answers.findIndex((a) => !a.correct);
    if (
      (failedAt >= 0 && failedAt !== answers.length - 1) ||
      (failedAt < 0 && answers.length !== total)
    )
      return 'invalid_league_end';
  }
  if (
    result.correctCount !== answers.filter((a) => a.correct).length ||
    result.score !==
      calculateScore(answers, result.scoreMultipliers, compatibility.scoring) ||
    result.elapsedMilliseconds !==
      getResponseTime(answers).elapsedMilliseconds ||
    result.elapsedSeconds !== getResponseTime(answers).elapsedSeconds
  )
    return 'invalid_totals';
  const victory = value.mode === 'league' && result.correctCount === 15;
  if (
    victory
      ? !isObject(value.victory) ||
        typeof value.victory.trainerName !== 'string' ||
        value.victory.trainerName.length > 20 ||
        !knownKeys(value.victory.pokemon) ||
        !value.victory.pokemon.length
      : value.victory !== null
  )
    return 'invalid_victory';
  return null;
}

export type EditUnit =
  | 'name'
  | 'partnerPokemon'
  | 'specialty'
  | 'answerFlow'
  | 'timerDisplay'
  | 'training';
export type EditValue = string | null | TrainingConfig;
export interface Edit {
  unit: EditUnit;
  value: EditValue;
  expectedRevision: number;
  predecessorId?: string;
}
const specialties = Object.keys(trainerSpecialtyDetails);
export function validEdit(value: unknown): value is Edit {
  if (
    !isObject(value) ||
    !integer(value.expectedRevision) ||
    (value.predecessorId !== undefined && !uuid(value.predecessorId))
  )
    return false;
  switch (value.unit) {
    case 'name':
      return (
        typeof value.value === 'string' &&
        value.value.length <= 20 &&
        value.value === value.value.trim()
      );
    case 'partnerPokemon':
      return value.value === null || pokemonKey(value.value);
    case 'specialty':
      return value.value === null || member(value.value, specialties);
    case 'answerFlow':
      return member(value.value, answerFlows);
    case 'timerDisplay':
      return member(value.value, timerDisplays);
    case 'training':
      return validTraining(value.value);
    default:
      return false;
  }
}
export interface Action {
  operationId: string;
  datasetId: string;
  generationId: string;
  payloadVersion: number;
  kind:
    | 'completion.record'
    | 'discoveries.add'
    | 'profile.patch'
    | 'preferences.patch'
    | 'issue.dismiss';
  payload: unknown;
}
export interface Outcome {
  operationId: string;
  requestHash: string;
  status: 'accepted' | 'rejected' | 'conflict';
  code: string;
  revision: number;
  unit?: EditUnit;
  unitRevision?: number;
}
export type ActionEnvelope = Omit<Action, 'kind'> & { kind: string };
export function validActionEnvelope(value: unknown): value is ActionEnvelope {
  return (
    isObject(value) &&
    uuid(value.operationId) &&
    uuid(value.datasetId) &&
    uuid(value.generationId) &&
    integer(value.payloadVersion) &&
    typeof value.kind === 'string' &&
    value.kind.length > 0 &&
    value.kind.length <= 100 &&
    Object.hasOwn(value, 'payload')
  );
}
export function validAction(value: unknown): value is Action {
  return (
    validActionEnvelope(value) &&
    member(value.kind, [
      'completion.record',
      'discoveries.add',
      'profile.patch',
      'preferences.patch',
      'issue.dismiss',
    ])
  );
}
export const validDiscoveries = (
  value: unknown,
): value is { pokemon: string[] } => isObject(value) && keys(value.pokemon);
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return JSON.stringify(value);
  throw new Error('Unsupported canonical value.');
}
function sortFields(value: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      fields.includes(key) && Array.isArray(entry)
        ? [...(entry as unknown[])].sort()
        : entry,
    ]),
  );
}
function hashPayload(value: unknown): unknown {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, 'completionId'))
    return {
      ...sortFields(value, ['discoveries']),
      ...(isObject(value.training)
        ? {
            training: sortFields(value.training, [
              'generations',
              'questionTypes',
            ]),
          }
        : {}),
    };
  if (value.unit === 'training' && isObject(value.value))
    return {
      ...value,
      value: sortFields(value.value, ['generations', 'questionTypes']),
    };
  return sortFields(value, ['pokemon']);
}
export async function hash(value: unknown) {
  const normalized = validActionEnvelope(value)
    ? {
        operationId: value.operationId,
        datasetId: value.datasetId,
        generationId: value.generationId,
        payloadVersion: value.payloadVersion,
        kind: value.kind,
        payload: hashPayload(value.payload),
      }
    : hashPayload(value);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      canonical({ encodingVersion: formatVersions.hash, value: normalized }),
    ),
  );
  return [...new Uint8Array(digest)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
