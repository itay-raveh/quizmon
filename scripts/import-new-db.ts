import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import {
  readRecordedGame,
  projectRoundHistory,
} from '../src/domain/player/game-history.ts';
import {
  archiveCompletion,
  scoreRound,
  validateRoundFact,
} from '../src/domain/sync/round-facts.ts';
import { defaultGameSettings } from '../src/domain/settings/game-settings.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args[at + 1];
};
const sourceUrl = flag('--source');
const targetUrl = flag('--target');
const reportPath = flag('--report');
const budgetId = flag('--budget-id');
const tunnelPort = flag('--tunnel-port');
if (!sourceUrl || !targetUrl || !reportPath || sourceUrl === targetUrl)
  throw new Error(
    'Usage: node scripts/import-new-db.ts --source OLD_URL --target EMPTY_NEW_URL --report REPORT.json [--budget-id OLD_BUDGET_ID] [--tunnel-port PORT]',
  );
if (
  tunnelPort &&
  (!Number.isInteger(Number(tunnelPort)) ||
    Number(tunnelPort) < 1 ||
    Number(tunnelPort) > 65535)
)
  throw new Error('Invalid tunnel port.');

const client = (connectionString: string) => {
  if (!tunnelPort) return new Client({ connectionString });
  const url = new URL(connectionString);
  return new Client({
    host: '127.0.0.1',
    port: Number(tunnelPort),
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname },
  });
};
const source = client(sourceUrl);
const target = client(targetUrl);
const all = async <T extends Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
): Promise<T[]> => (await source.query<T>(query, values)).rows;
const put = (query: string, values: unknown[]) => target.query(query, values);
const pseudonym = (id: string) =>
  createHash('sha256').update(id).digest('hex').slice(0, 12);
const day = (date: unknown) =>
  date instanceof Date
    ? date.toISOString().slice(0, 10)
    : String(date).slice(0, 10);

try {
  await source.connect();
  await target.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await target.query('BEGIN');
  const [existing] = await target
    .query<{ users: string; rounds: string }>(
      'SELECT (SELECT count(*) FROM "user")::text AS users,(SELECT count(*) FROM round)::text AS rounds',
    )
    .then((result) => result.rows);
  if (existing?.users !== '0' || existing.rounds !== '0')
    throw new Error('The target is not empty. Use a fresh migrated database.');
  const users = await all<Record<string, unknown>>(
    'SELECT * FROM "user" ORDER BY id',
  );
  const accounts = await all<Record<string, unknown>>(
    'SELECT * FROM account ORDER BY id',
  );
  const states = await all<Record<string, unknown>>(
    'SELECT * FROM account_state ORDER BY id',
  );
  const datasets = await all<Record<string, unknown>>(
    'SELECT * FROM linked_datasets ORDER BY id',
  );
  const completions = await all<Record<string, unknown>>(
    'SELECT * FROM completion_facts ORDER BY owner_id,completed_at,completion_id',
  );
  const outcomes = await all<Record<string, unknown>>(
    'SELECT * FROM operation_outcomes ORDER BY owner_id,operation_id',
  );
  const friendships = await all<Record<string, unknown>>(
    'SELECT * FROM friend_requests ORDER BY id',
  );
  const social = await all<Record<string, unknown>>(
    'SELECT * FROM social_players ORDER BY id',
  );
  const pokemon = await all<Record<string, unknown>>(
    'SELECT * FROM player_pokemon ORDER BY owner_id,pokemon',
  );
  const oldDaily = await all<Record<string, unknown>>(
    'SELECT owner_id,date FROM daily_results ORDER BY owner_id,date',
  );
  const issues = await all<Record<string, unknown>>(
    'SELECT owner_id,dismissed FROM sync_issues',
  );
  const budget = await all<Record<string, unknown>>(
    'SELECT * FROM email_budget ORDER BY id',
  );
  const report = {
    sourceCounts: {
      users: users.length,
      accounts: accounts.length,
      rounds: completions.length,
      datasets: datasets.length,
      edits: outcomes.length,
      friendships: friendships.length,
    },
    inferredDailyStarts: 0,
    unassistedSearchFallbacks: 0,
    users: [] as Record<string, unknown>[],
    budget: null as null | {
      day: string;
      dayCount: number;
      cycle: string;
      cycleCount: number;
    },
  };
  const byOwner = <T extends Record<string, unknown>>(
    rows: T[],
    key: string,
    id: string,
  ) => rows.filter((row) => row[key] === id);
  for (const user of users) {
    const id = String(user.id);
    await put(
      'INSERT INTO "user"(id,name,email,email_verified,image,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [
        id,
        user.name,
        user.email,
        user.email_verified,
        user.image,
        user.created_at,
        user.updated_at,
      ],
    );
  }
  for (const account of accounts) {
    await put(
      'INSERT INTO account(id,account_id,provider_id,user_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        account.id,
        account.account_id,
        account.provider_id,
        account.user_id,
        account.created_at,
        account.updated_at,
      ],
    );
  }
  const codes = new Map(
    social.map((row) => [String(row.id), String(row.code)]),
  );
  for (const user of users) {
    const id = String(user.id);
    const state = states.find((row) => row.id === id);
    const edits = (state?.edits ?? {}) as Record<string, unknown>;
    const training = (edits.training ?? {}) as Record<string, unknown>;
    const oldCode = codes.get(id);
    const code =
      oldCode ??
      createHash('sha256').update(id).digest('hex').slice(0, 16).toUpperCase();
    await put(
      `INSERT INTO player(id,code,joined_on,name,avatar,partner,specialty,answer_flow,timer_display,
      training_mode,difficulty,question_selection,generations,form_groups,question_types,auto_types)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        code,
        state?.profile_created_at ?? day(user.created_at),
        edits.name ?? '',
        edits.avatar ?? null,
        edits.partnerPokemon ?? null,
        edits.specialty ?? null,
        edits.answerFlow ?? 'manual',
        edits.timerDisplay ?? defaultGameSettings.timerDisplay,
        training.trainingMode ?? defaultGameSettings.trainingMode,
        training.difficulty ?? defaultGameSettings.difficulty,
        training.questionSelection ?? defaultGameSettings.questionSelection,
        training.generations ?? defaultGameSettings.generations,
        training.formGroups ?? defaultGameSettings.formGroups,
        training.questionTypes ?? defaultGameSettings.questionTypes,
        training.automaticQuestionTypes ?? null,
      ],
    );
    const ownerRounds = byOwner(completions, 'owner_id', id);
    const converted = [];
    const scoreChanges = [];
    for (const row of ownerRounds) {
      const old = readRecordedGame(row.completion);
      if (
        old.completionId !== row.completion_id ||
        old.datasetId !== row.dataset_id
      )
        throw new Error('An old completion has mismatched IDs.');
      const archived = archiveCompletion(old, Boolean(row.eligible));
      if (!validateRoundFact(archived))
        throw new Error('An old completion cannot be archived.');
      if (archived.mode === 'daily') report.inferredDailyStarts++;
      report.unassistedSearchFallbacks += old.result.answers.filter(
        (answer) => answer.unassistedSearch === undefined,
      ).length;
      const scored = scoreRound(archived);
      const newScore = scored.score;
      if (newScore !== old.result.score)
        scoreChanges.push({
          round: pseudonym(archived.id),
          old: old.result.score,
          new: newScore,
        });
      await put(
        `INSERT INTO round(id,player_id,mode,day,puzzle_id,started_on,completed_at,credited,data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          archived.id,
          id,
          archived.mode,
          archived.day,
          archived.puzzle_id,
          archived.started_on,
          archived.completed_at,
          archived.credited,
          archived.data,
        ],
      );
      await put(
        'INSERT INTO round_score(round_id,score,elapsed_ms) VALUES ($1,$2,$3)',
        [archived.id, scored.score, scored.elapsedMilliseconds ?? 0],
      );
      converted.push(archived);
    }
    for (const dataset of byOwner(datasets, 'owner_id', id))
      await put('INSERT INTO dataset(id,player_id) VALUES ($1,$2)', [
        dataset.id,
        id,
      ]);
    let editReceipts = 0;
    for (const row of byOwner(outcomes, 'owner_id', id)) {
      const outcome = row.outcome as Record<string, unknown>;
      if (
        !outcome.unit &&
        !['edit_conflict', 'specialty_not_earned'].includes(
          String(outcome.code),
        )
      )
        continue;
      await put(
        'INSERT INTO op(id,player_id,hash,status,reason) VALUES ($1,$2,$3,$4,$5)',
        [
          row.operation_id,
          id,
          row.hash,
          outcome.status === 'accepted' ? 'accepted' : 'rejected',
          outcome.status === 'accepted' ? null : outcome.code,
        ],
      );
      editReceipts++;
    }
    const found = new Set(converted.flatMap((row) => row.data.found));
    const oldFound = byOwner(pokemon, 'owner_id', id)
      .filter((row) => row.discovered)
      .map((row) => String(row.pokemon));
    const standalone = oldFound.filter((name) => !found.has(name));
    const creditedDaily = converted
      .filter((row) => row.mode === 'daily' && row.credited)
      .map((row) => row.day);
    const projected = projectRoundHistory(converted);
    const oldCorrect = byOwner(pokemon, 'owner_id', id)
      .filter((row) => row.correct)
      .map((row) => String(row.pokemon))
      .sort();
    const newCorrect = [...projected.results.progress.correctPokemon].sort();
    if (JSON.stringify(oldCorrect) !== JSON.stringify(newCorrect))
      throw new Error('Correct Pokémon differ for an imported user.');
    const oldDates = byOwner(oldDaily, 'owner_id', id)
      .map((row) => String(row.date))
      .sort();
    if (JSON.stringify(oldDates) !== JSON.stringify([...creditedDaily].sort()))
      throw new Error('Credited Daily dates differ for an imported user.');
    const previous = (state?.progress ?? {}) as Record<string, unknown>;
    const current = projected.results.progress;
    const compare = [
      'championAnswersWithoutClues',
      'correctCategories',
      'correctGenerations',
      'correctQuestionTypes',
      'masteryRounds',
      'quickAttackRounds',
    ] as const;
    for (const key of compare)
      if (
        JSON.stringify(previous[key] ?? {}) !==
        JSON.stringify(current[key] ?? {})
      ) {
        const equalObjects =
          previous[key] !== null &&
          typeof previous[key] === 'object' &&
          typeof current[key] === 'object' &&
          JSON.stringify(Object.entries(previous[key]).sort()) ===
            JSON.stringify(Object.entries(current[key]).sort());
        if (!equalObjects)
          throw new Error(
            `Progress measure ${key} differs for an imported user.`,
          );
      }
    if (
      Number(previous.rounds ?? 0) !==
      converted.filter((row) => row.credited).length
    )
      throw new Error('Credited round count differs for an imported user.');
    report.users.push({
      user: pseudonym(id),
      rounds: converted.length,
      creditedDaily,
      found: found.size,
      oldFound: oldFound.length,
      discardedStandalone: standalone.length,
      correctPokemon: newCorrect.length,
      progressMeasuresMatched: true,
      dailyDatesMatched: true,
      leagueVictories: projected.hallOfFame.length,
      changedScores: scoreChanges,
      editReceipts,
      rejectedIssues: byOwner(issues, 'owner_id', id).filter(
        (row) => !row.dismissed,
      ).length,
      friendCodePreserved: code === oldCode,
    });
  }
  for (const row of friendships) {
    const from = String(row.sender_id);
    const to = row.user_low === from ? row.user_high : row.user_low;
    await put(
      'INSERT INTO friend(id,from_id,to_id,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [row.id, from, to, row.status, row.created_at, row.updated_at],
    );
  }
  const selectedBudget = budgetId
    ? budget.find((row) => row.id === budgetId)
    : budget.length === 1
      ? budget[0]
      : undefined;
  if (budget.length && !selectedBudget)
    throw new Error(
      'Choose the source email budget explicitly with --budget-id.',
    );
  if (selectedBudget) {
    report.budget = {
      day: day(selectedBudget.day),
      dayCount: Number(selectedBudget.daily_count),
      cycle: String(selectedBudget.cycle),
      cycleCount: Number(selectedBudget.cycle_count),
    };
    await put(
      'INSERT INTO mail_budget(id,day,day_count,cycle,cycle_count) VALUES (1,$1,$2,$3,$4)',
      [
        report.budget.day,
        report.budget.dayCount,
        report.budget.cycle,
        report.budget.cycleCount,
      ],
    );
  }
  const totals = await target.query<{
    users: string;
    rounds: string;
    datasets: string;
    friends: string;
  }>(
    'SELECT (SELECT count(*) FROM "user")::text AS users,(SELECT count(*) FROM round)::text AS rounds,(SELECT count(*) FROM dataset)::text AS datasets,(SELECT count(*) FROM friend)::text AS friends',
  );
  if (
    Number(totals.rows[0]?.users) !== users.length ||
    Number(totals.rows[0]?.rounds) !== completions.length ||
    Number(totals.rows[0]?.datasets) !== datasets.length ||
    Number(totals.rows[0]?.friends) !== friendships.length
  )
    throw new Error('Imported row counts do not match the source.');
  await target.query('COMMIT');
  await source.query('COMMIT');
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  process.stdout.write(
    `Imported ${users.length} users and ${completions.length} rounds. Report: ${reportPath}\n`,
  );
} catch (error) {
  await target.query('ROLLBACK').catch(() => {});
  await source.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await source.end();
  await target.end();
}
