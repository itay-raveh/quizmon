import { parseRound } from '../../domain/player/schemas/round.ts';
import { isDailyDate, isRecord } from '../validation.ts';

// Only persisted question identifiers change. Answer values and metadata stay intact.
const retiredQuestionTypes: Record<string, string> = {
  pokemonFromHistoricalSprite: 'pokemonIdentification',
  pokemonFromSilhouette: 'pokemonIdentification',
  spriteForPokemon: 'pokemonMatch',
  silhouetteForPokemon: 'pokemonMatch',
};

const migrateQuestionType = (value: unknown): unknown =>
  typeof value === 'string' && Object.hasOwn(retiredQuestionTypes, value)
    ? retiredQuestionTypes[value]
    : value;

function migrateSettings(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const settings = { ...value };
  for (const key of ['questionTypes', 'automaticQuestionTypes']) {
    if (Array.isArray(settings[key]))
      settings[key] = [...new Set(settings[key].map(migrateQuestionType))];
  }
  return settings;
}

function migrateSnapshot(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const snapshot = { ...value };
  for (const key of ['answers', 'questions']) {
    if (Array.isArray(snapshot[key]))
      snapshot[key] = snapshot[key].map((entry: unknown) =>
        isRecord(entry) && 'questionType' in entry
          ? { ...entry, questionType: migrateQuestionType(entry.questionType) }
          : entry,
      );
  }
  if ('settings' in snapshot)
    snapshot.settings = migrateSettings(snapshot.settings);
  return snapshot;
}

export function migratePlayerV1<T>(document: T): T {
  if (!isRecord(document) || !('settings' in document)) return document;
  return { ...document, settings: migrateSettings(document.settings) };
}

export function migrateRoundV1<T>(document: T): T {
  if (!isRecord(document) || !Array.isArray(document.answers)) return document;
  return {
    ...document,
    answers: document.answers.map((answer: unknown) =>
      isRecord(answer) && 'type' in answer
        ? { ...answer, type: migrateQuestionType(answer.type) }
        : answer,
    ),
  };
}

export function migrateDeviceV1<T>(document: T): T {
  if (!isRecord(document) || !isRecord(document.payload)) return document;
  if (typeof document.id === 'string' && document.id.startsWith('round:')) {
    const payload = migrateSnapshot(document.payload);
    if (
      document._deleted !== true &&
      document.payload.completedAt !== undefined &&
      !parseRound(payload)
    )
      throw new Error(
        'A completed device round needs recovery before migration.',
      );
    return { ...document, payload };
  }
  if (document.id !== 'state' || !isRecord(document.payload.dailyAttempts))
    return document;
  const dailyAttempts = Object.fromEntries(
    Object.entries(document.payload.dailyAttempts).map(([day, value]) => {
      const migrated = migrateSnapshot(value);
      // A spent Daily survives even when its old lineup cannot be resumed.
      const claimed =
        isDailyDate(day) &&
        isRecord(migrated) &&
        isRecord(migrated.mode) &&
        migrated.mode.kind === 'daily' &&
        migrated.mode.date === day;
      return [day, claimed ? true : migrated];
    }),
  );
  return { ...document, payload: { ...document.payload, dailyAttempts } };
}
