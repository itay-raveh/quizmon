import { z } from 'zod';
import {
  compactRoundSchema,
  type CompactRound,
} from '../src/domain/sync/compact-rounds.ts';
import type { SyncedRound } from '../src/lib/storage/rxdb-schema.ts';
import { questionDefinitions } from '../src/domain/quiz/questions/definitions.ts';
import { trainerProfileSchema } from '../src/domain/player/trainer-profile.ts';
import { savedSettingsSchema } from '../src/domain/player/schemas/player-data.ts';
import type { SyncedPlayer } from '../src/lib/storage/rxdb-schema.ts';

export function convertLegacyPlayer(value: unknown): SyncedPlayer {
  const source = z
    .object({
      id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
      ownerId: z.string(),
      profile: z.unknown(),
      settings: z.unknown().nullable(),
    })
    .parse(value);
  if (source.id !== source.ownerId)
    throw new Error(`Player ${source.id} has a mismatched owner.`);
  return {
    id: source.id,
    profile: trainerProfileSchema.parse(source.profile),
    settings:
      source.settings === null
        ? null
        : savedSettingsSchema.parse(source.settings),
  };
}

const legacyRound = z.object({
  id: z.string(),
  ownerId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  fact: z.object({
    id: z.string(),
    mode: z.enum(['training', 'daily', 'league']),
    day: z.string().nullable(),
    completed_at: z.string(),
    data: z.object({
      config: z.object({
        difficulty: z.number().optional(),
        generations: z.array(z.string()),
        form_groups: z.array(z.string()),
      }),
      answers: z.array(
        z.object({
          question_type: z.string(),
          subject: z.object({ kind: z.string(), name: z.string() }),
          question: z.object({
            interaction: z.string(),
            options: z.array(z.string()),
            expected: z.array(z.string()),
            selected: z.array(z.string()),
          }),
          clues_used: z.number(),
          response_ms: z.number(),
        }),
      ),
    }),
  }),
});

export function convertLegacyRound(value: unknown): SyncedRound | null {
  const { id, ownerId, fact } = legacyRound.parse(value);
  if (id !== fact.id) throw new Error(`Round ${id} has a mismatched fact ID.`);
  if (
    fact.data.answers.some(
      (answer) =>
        answer.question_type === 'itemIdentification' &&
        answer.subject.kind === 'move',
    )
  )
    return null;
  for (const answer of fact.data.answers) {
    const kind =
      answer.question_type === 'champion'
        ? 'pokemon'
        : questionDefinitions[
            answer.question_type as keyof typeof questionDefinitions
          ]?.subjectKind;
    if (kind !== answer.subject.kind)
      throw new Error(`Round ${id} has an unsupported subject kind.`);
  }
  const answers = fact.data.answers.map((answer) => ({
    type: answer.question_type,
    subject: answer.subject.name,
    ...(answer.question.interaction !== 'search' &&
    answer.question.options.length === 4
      ? { options: answer.question.options }
      : {}),
    expected: answer.question.expected,
    selected: answer.question.selected,
    responseMs: answer.response_ms,
    ...(answer.question_type === 'champion' && answer.clues_used > 0
      ? { cluesUsed: answer.clues_used }
      : {}),
  }));
  const common = { id, completedAt: fact.completed_at, answers };
  const round: CompactRound = compactRoundSchema.parse(
    fact.mode === 'training'
      ? {
          ...common,
          mode: 'training',
          training: {
            ...(fact.data.config.difficulty === undefined
              ? {}
              : { difficulty: fact.data.config.difficulty }),
            generations: fact.data.config.generations,
            formGroups: fact.data.config.form_groups,
          },
        }
      : fact.mode === 'daily'
        ? { ...common, mode: 'daily', day: fact.day }
        : { ...common, mode: 'league' },
  );
  return { ...round, ownerId };
}
