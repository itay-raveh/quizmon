import { trainerSpecialtyDetails } from '../player/trainer-progression.ts';
import { isTrainerAvatar } from '../player/trainer-avatars.ts';
import { formatVersions, gameVersions } from '../versions.ts';
import {
  isChoice,
  isRecord as isObject,
  isUuid as uuid,
} from '../../lib/validation.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import { formGroups, generations } from '../pokemon/types.ts';
import { difficultySchema } from '../quiz/difficulty.ts';
import { questionTypes } from '../quiz/questions/definitions.ts';
import type { AnswerResult, GameResult } from '../quiz/types.ts';
import { getTrainingSettings } from '../settings/game-settings.ts';
import type { GameSettings } from '../settings/types.ts';
import {
  answerFlows,
  timerDisplays,
  trainingModes,
} from '../settings/types.ts';
export { isUuid as uuid } from '../../lib/validation.ts';

export const versions = {
  ...gameVersions,
  record: formatVersions.completion,
} as const;
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
function validTraining(value: unknown): value is TrainingConfig {
  return (
    isObject(value) &&
    isChoice(value.trainingMode, trainingModes) &&
    (value.difficulty === undefined ||
      difficultySchema.safeParse(value.difficulty).success) &&
    (value.questionSelection === undefined ||
      isChoice(value.questionSelection, ['automatic', 'custom'])) &&
    (value.formGroups === undefined ||
      (Array.isArray(value.formGroups) &&
        value.formGroups.length > 0 &&
        value.formGroups.every((v) => isChoice(v, formGroups)) &&
        new Set(value.formGroups).size === value.formGroups.length)) &&
    (value.automaticQuestionTypes === undefined ||
      (Array.isArray(value.automaticQuestionTypes) &&
        value.automaticQuestionTypes.length > 0 &&
        value.automaticQuestionTypes.every((v) => isChoice(v, questionTypes)) &&
        new Set(value.automaticQuestionTypes).size ===
          value.automaticQuestionTypes.length)) &&
    Array.isArray(value.generations) &&
    value.generations.length > 0 &&
    value.generations.length <= generations.length &&
    value.generations.every((v) => isChoice(v, generations)) &&
    new Set(value.generations).size === value.generations.length &&
    Array.isArray(value.questionTypes) &&
    value.questionTypes.length > 0 &&
    value.questionTypes.length <= questionTypes.length &&
    value.questionTypes.every((v) => isChoice(v, questionTypes)) &&
    new Set(value.questionTypes).size === value.questionTypes.length
  );
}

export interface RoundCompletion {
  recordVersion: 1;
  completionId: string;
  datasetId: string;
  contentVersion: number;
  scoreVersion: number;
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
type EditUnit =
  | 'avatar'
  | 'name'
  | 'partnerPokemon'
  | 'specialty'
  | 'answerFlow'
  | 'timerDisplay'
  | 'training';
type EditValue = string | null | TrainingConfig;
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
    case 'avatar':
      return value.value === null || isTrainerAvatar(value.value);
    case 'specialty':
      return value.value === null || isChoice(value.value, specialties);
    case 'answerFlow':
      return isChoice(value.value, answerFlows);
    case 'timerDisplay':
      return isChoice(value.value, timerDisplays);
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
type ActionEnvelope = Omit<Action, 'kind'> & { kind: string };
function validActionEnvelope(value: unknown): value is ActionEnvelope {
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
    isChoice(value.kind, [
      'completion.record',
      'discoveries.add',
      'profile.patch',
      'preferences.patch',
      'issue.dismiss',
    ])
  );
}
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
