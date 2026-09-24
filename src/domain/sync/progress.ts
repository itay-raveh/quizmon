import { formatVersions, gameVersions } from '../versions.ts';
import { isRecord, isUuid as uuid } from '../../lib/validation.ts';
import type { AnswerResult, GameResult } from '../quiz/types.ts';
import { getTrainingSettings } from '../settings/game-settings.ts';
import type { GameSettings } from '../settings/types.ts';
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
type ActionEnvelope = {
  operationId: string;
  datasetId: string;
  generationId: string;
  payloadVersion: number;
  kind: string;
  payload: unknown;
};
function validActionEnvelope(value: unknown): value is ActionEnvelope {
  return (
    isRecord(value) &&
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
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value))
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
  if (!isRecord(value)) return value;
  if (Object.hasOwn(value, 'completionId'))
    return {
      ...sortFields(value, ['discoveries']),
      ...(isRecord(value.training)
        ? {
            training: sortFields(value.training, [
              'generations',
              'questionTypes',
            ]),
          }
        : {}),
    };
  if (value.unit === 'training' && isRecord(value.value))
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
