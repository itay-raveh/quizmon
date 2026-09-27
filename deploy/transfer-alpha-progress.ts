import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import type { QueryResultRow } from 'pg';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { defaultGameSettings } from '../src/domain/settings/game-settings.ts';
import { savedSettingsSchema } from '../src/domain/player/schemas/player-data.ts';
import { trainerProfileSchema } from '../src/domain/player/trainer-profile.ts';
import { validateRoundFact } from '../src/domain/sync/round-facts.ts';
import { openPlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { readMigrationConnection } from './release-inputs.ts';
import { withReleaseLock } from './release-lock.ts';

interface OldPlayerRow extends QueryResultRow {
  id: string;
  joined_on: string;
  name: string;
  avatar: string | null;
  partner: string | null;
  specialty: string | null;
  answer_flow: string;
  timer_display: string;
  training_mode: string;
  difficulty: number;
  question_selection: string;
  generations: string[];
  form_groups: string[];
  question_types: string[];
  auto_types: string[] | null;
}

interface OldRoundRow extends QueryResultRow {
  id: string;
  player_id: string;
  mode: string;
  day: string | null;
  puzzle_id: string | null;
  started_on: string | null;
  completed_at: Date;
  credited: boolean;
  data: Record<string, unknown>;
}

const configFile = process.argv[2];
const dryRun = process.argv[3] === '--dry-run';
if (!configFile || (process.argv[3] && !dryRun))
  throw new Error(
    'Usage: transfer-alpha-progress.ts <migration-connection.json> [--dry-run]',
  );

let stage = 'configuration';
try {
  const connection = readMigrationConnection(
    JSON.parse(await readFile(configFile, 'utf8')),
  );
  stage = 'PostgreSQL connection';
  await withReleaseLock(connection, async ({ client, assertConnected }) => {
    stage = 'source query';
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    let players: OldPlayerRow[];
    let rounds: OldRoundRow[];
    try {
      players = (
        await client.query<OldPlayerRow>(`
          SELECT id, joined_on::text, name, avatar, partner, specialty,
                 answer_flow, timer_display, training_mode, difficulty,
                 question_selection, generations, form_groups, question_types, auto_types
          FROM player ORDER BY id
        `)
      ).rows;
      rounds = (
        await client.query<OldRoundRow>(`
          SELECT id, player_id, mode, day::text, puzzle_id, started_on::text,
                 completed_at, credited, data
          FROM round ORDER BY completed_at, id
        `)
      ).rows;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    stage = 'source validation';
    const sourcePlayers = players.map((row) => ({
      id: row.id,
      ownerId: row.id,
      profile: trainerProfileSchema.parse({
        avatar: row.avatar,
        createdAt: row.joined_on,
        hasBeenRevealed: true,
        name: row.name,
        partnerPokemon: row.partner,
        specialty: row.specialty,
      }),
      settings: savedSettingsSchema.parse({
        ...defaultGameSettings,
        answerFlow: row.answer_flow,
        timerDisplay: row.timer_display,
        trainingMode: row.training_mode,
        difficulty: row.difficulty,
        questionSelection: row.question_selection,
        generations: row.generations,
        formGroups: row.form_groups,
        questionTypes: row.question_types,
        automaticQuestionTypes: row.auto_types ?? undefined,
      }),
    }));
    const sourceRounds = rounds.map((row) => {
      const data = { ...row.data };
      delete data.score_version;
      const fact = {
        id: row.id,
        mode: row.mode,
        day: row.day,
        puzzle_id: row.puzzle_id,
        started_on: row.started_on,
        completed_at: row.completed_at.toISOString(),
        credited: row.credited,
        data,
      };
      if (!validateRoundFact(fact)) throw new Error('Invalid source round.');
      return { id: row.id, ownerId: row.player_id, fact };
    });
    const ownerIds = new Set(sourcePlayers.map((player) => player.id));
    if (sourceRounds.some((round) => !ownerIds.has(round.ownerId)))
      throw new Error('A source round has no player.');
    assertConnected();

    if (dryRun) {
      console.log(
        JSON.stringify({
          players: sourcePlayers.length,
          rounds: sourceRounds.length,
        }),
      );
      return;
    }

    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) throw new Error('MONGO_URL is required.');
    stage = 'MongoDB connection';
    const mongo = new URL(mongoUrl);
    if (process.env.MONGO_TLS_CA_FILE)
      mongo.searchParams.set('tlsCAFile', process.env.MONGO_TLS_CA_FILE);
    if (process.env.MONGO_TLS_CERT_KEY_FILE)
      mongo.searchParams.set(
        'tlsCertificateKeyFile',
        process.env.MONGO_TLS_CERT_KEY_FILE,
      );
    const db = await openPlayerDatabase(
      'quizmon_server',
      getRxStorageMongoDB({ connection: mongo.toString() }),
      false,
    );
    try {
      stage = 'target transfer';
      for (const player of sourcePlayers) {
        const existing = await db.players.findOne(player.id).exec();
        if (existing) {
          if (
            existing.ownerId !== player.ownerId ||
            !isDeepStrictEqual(existing.profile, player.profile) ||
            !isDeepStrictEqual(existing.settings, player.settings)
          )
            throw new Error('A target player differs from the source.');
        } else await db.players.insert(player);
      }
      for (const round of sourceRounds) {
        const existing = await db.rounds.findOne(round.id).exec();
        if (existing) {
          if (
            existing.ownerId !== round.ownerId ||
            !isDeepStrictEqual(existing.fact, round.fact)
          )
            throw new Error('A target round differs from the source.');
        } else await db.rounds.insert(round);
      }
      for (const player of sourcePlayers)
        if (!(await db.players.findOne(player.id).exec()))
          throw new Error('A transferred player is missing.');
      for (const round of sourceRounds)
        if (!(await db.rounds.findOne(round.id).exec()))
          throw new Error('A transferred round is missing.');
      assertConnected();
      console.log(
        JSON.stringify({
          players: sourcePlayers.length,
          rounds: sourceRounds.length,
        }),
      );
    } finally {
      await db.close();
    }
  });
} catch {
  console.error(
    `Alpha progress transfer failed during ${stage}. The PostgreSQL source was not changed.`,
  );
  process.exitCode = 1;
}
