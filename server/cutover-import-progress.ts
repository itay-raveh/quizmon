import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { MongoClient } from 'mongodb';
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { openPlayerDatabase } from '../src/lib/storage/rxdb-database.ts';
import { convertLegacyPlayer, convertLegacyRound } from './cutover-data.ts';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--apply'))
  throw new Error('Usage: node server/cutover-import-progress.ts [--apply]');
const mongoUrl = process.env.CUTOVER_MONGO_URL;
if (!mongoUrl) throw new Error('Set CUTOVER_MONGO_URL.');
const targetMongoUrl = process.env.CUTOVER_TARGET_MONGO_URL ?? mongoUrl;
const sourceName = process.env.CUTOVER_SOURCE_DB ?? 'quizmon_server-v1';
const targetName = process.env.CUTOVER_TARGET_NAME ?? 'quizmon_progress';
if (sourceName === `${targetName}-v0`)
  throw new Error('Source and target databases must differ.');

const client = await new MongoClient(mongoUrl).connect();
try {
  const source = client.db(sourceName);
  const [legacyPlayers, legacyRounds] = await Promise.all([
    source.collection('players').find({ _deleted: false }).toArray(),
    source.collection('rounds').find({ _deleted: false }).toArray(),
  ]);
  const players = legacyPlayers
    .map(convertLegacyPlayer)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!players.length) throw new Error('No legacy players found.');
  const omitted = new Map<string, number>();
  const rounds = legacyRounds.flatMap((value) => {
    const round = convertLegacyRound(value);
    if (round) return [round];
    const ownerId = String(value.ownerId);
    omitted.set(ownerId, (omitted.get(ownerId) ?? 0) + 1);
    return [];
  });
  rounds.sort((a, b) => a.id.localeCompare(b.id));
  const owners = new Set(players.map(({ id }) => id));
  if (
    owners.size !== players.length ||
    new Set(rounds.map(({ id }) => id)).size !== rounds.length ||
    rounds.some(({ ownerId }) => !owners.has(ownerId))
  )
    throw new Error('Legacy progress has duplicate IDs or missing owners.');
  const hash = createHash('sha256')
    .update(JSON.stringify({ players, rounds }))
    .digest('hex');
  console.log(
    JSON.stringify({
      source: sourceName,
      target: `${targetName}-v0`,
      players: players.length,
      rounds: rounds.length,
      omitted: Object.fromEntries([...omitted].sort()),
      sha256: hash,
      applied: args.includes('--apply'),
    }),
  );
  if (args.includes('--apply')) {
    const db = await openPlayerDatabase(
      targetName,
      getRxStorageMongoDB({ connection: targetMongoUrl }),
      false,
    );
    try {
      for (const player of players) {
        const current = await db.players.findOne(player.id).exec();
        if (!current) await db.players.insert(player);
        else if (!isDeepStrictEqual(current.toJSON(), player))
          throw new Error(`Player ${player.id} differs from source.`);
      }
      for (const round of rounds) {
        const current = await db.rounds.findOne(round.id).exec();
        if (!current) await db.rounds.insert(round);
        else if (!isDeepStrictEqual(current.toJSON(), round))
          throw new Error(`Round ${round.id} differs from source.`);
      }
      console.log('Progress import complete.');
    } finally {
      await db.close();
    }
  }
} finally {
  await client.close();
}
