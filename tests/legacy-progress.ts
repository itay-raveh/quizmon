import { createRxDatabase } from 'rxdb/plugins/core';
import type { RxStorage } from 'rxdb';
import { completion } from './online/progress-fixtures.ts';
import { compactCompletion } from '../src/domain/sync/compact-rounds.ts';
import { defaultGameSettings } from '../src/domain/settings/game-settings.ts';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import type { PlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import {
  deviceSchema,
  playerSchema,
  roundSchema,
} from '../src/lib/storage/rxdb-schema.ts';

export async function openLegacyDatabase(
  name: string,
  storage: RxStorage<unknown, unknown>,
  multiInstance = false,
): Promise<PlayerDatabase> {
  const db: PlayerDatabase = await createRxDatabase({
    name,
    storage,
    multiInstance,
  });
  await db.addCollections({
    players: { schema: { ...playerSchema, version: 0 } },
    rounds: { schema: { ...roundSchema, version: 0 } },
    device: { schema: { ...deviceSchema, version: 0 } },
  });
  return db;
}

export function legacyProgress(ownerId = 'guest') {
  const retired = [
    'pokemonFromHistoricalSprite',
    'spriteForPokemon',
    'pokemonFromSilhouette',
    'silhouetteForPokemon',
  ];
  const completed = completion();
  const current = { ...compactCompletion(completed), ownerId };
  current.answers.forEach((answer, index) => {
    answer.type = index % 2 ? 'pokemonMatch' : 'pokemonIdentification';
    answer.selected = [index % 3 ? 'bulbasaur' : 'ivysaur'];
    answer.responseMs = 900 + index * 137;
  });
  // A value that happens to look like a retired ID must remain a raw answer value.
  current.answers[0]!.subject = retired[0]!;
  current.answers[0]!.expected = [retired[0]!];
  current.answers[0]!.selected = [retired[0]!];
  const legacy = structuredClone(current);
  legacy.answers.forEach((answer, index) => {
    answer.type = retired[index % retired.length]!;
  });
  const player: import('../src/lib/storage/rxdb-schema.ts').SyncedPlayer = {
    id: ownerId,
    profile: { ...createTrainerProfile(), name: 'spriteForPokemon' },
    settings: {
      ...defaultGameSettings,
      questionSelection: 'custom' as const,
      questionTypes: [...defaultGameSettings.questionTypes],
      automaticQuestionTypes: [],
    },
  };
  Reflect.set(player.settings!, 'questionTypes', [...retired, 'pokemonTypes']);
  Reflect.set(player.settings!, 'automaticQuestionTypes', [
    retired[3],
    'pokemonTypes',
    retired[1],
  ]);
  const snapshot = {
    roundId: current.id,
    completedAt: current.completedAt,
    seed: 'stored-legacy-seed',
    mode: { kind: 'training' },
    elapsedMilliseconds: current.answers.reduce(
      (sum, answer) => sum + answer.responseMs,
      0,
    ),
    questionCount: current.answers.length,
    playerRestoreId: null,
    settings: { ...player.settings, level: 3 },
    answers: completed.result.answers.map((answer, index) => ({
      ...answer,
      questionType: retired[index % retired.length],
      category: 'identity',
      observation: {
        ...answer.observation!,
        expected: current.answers[index]!.expected,
        selected: current.answers[index]!.selected,
      },
      subject: {
        kind: 'pokemon',
        name: current.answers[index]!.subject,
        generation: 'I',
      },
      responseMilliseconds: current.answers[index]!.responseMs,
    })),
    questions: current.answers.map((answer, index) => ({
      id: `saved-${index}`,
      questionType: retired[index % retired.length],
      category: 'identity',
      subject: {
        kind: 'pokemon',
        name: answer.subject,
        generation: 'I',
        types: [],
      },
      repetition: {
        identity: `saved-${index}`,
        subjects: [answer.subject],
        primary: [],
        distractors: [],
      },
      options: ['bulbasaur', 'ivysaur'],
      answer: { interaction: 'single-choice', correctOptions: ['bulbasaur'] },
      prompt: { kind: 'text', text: 'Stored prompt' },
      media: { kind: 'sprite', src: '/stored-sprite.png' },
    })),
  };
  return { current, legacy, player, snapshot };
}
