import type { PowerSyncDatabase } from '@powersync/web';
import { readRecordedGame } from '../../domain/player/game-history.ts';
import { defaultGameSettings } from '../../domain/settings/game-settings.ts';
import {
  validAction,
  validEdit,
  type Action,
  type TrainingConfig,
} from '../../domain/sync/progress.ts';
import { archiveCompletion } from '../../domain/sync/round-facts.ts';
import { parseActiveGameSave } from '../../domain/player/active-game.ts';
import { openLocalDatabaseV1, type LocalRow } from './local-database.ts';
import { parseSavedPlayerStateV1 } from './saved-state-v1.ts';

const editUnit = {
  name: 'name',
  avatar: 'avatar',
  partnerPokemon: 'partner',
  specialty: 'specialty',
  answerFlow: 'answer_flow',
  timerDisplay: 'timer_display',
  training: 'training',
} as const;

function convertTraining(value: TrainingConfig) {
  return {
    training_mode: value.trainingMode,
    difficulty: value.difficulty ?? defaultGameSettings.difficulty,
    question_selection:
      value.questionSelection ?? defaultGameSettings.questionSelection,
    generations: value.generations,
    form_groups: value.formGroups ?? defaultGameSettings.formGroups,
    question_types: value.questionTypes,
    auto_types: value.automaticQuestionTypes ?? null,
  };
}

export function convertSavedActionV1(action: Action) {
  if (action.kind === 'completion.record') {
    const completion = readRecordedGame(action.payload);
    if (
      completion.completionId !== action.operationId ||
      completion.datasetId !== action.datasetId
    )
      throw new Error('An old round change has mismatched identities.');
    const { credited: _credited, ...round } = archiveCompletion(completion);
    void _credited;
    return {
      id: action.operationId,
      datasetId: action.datasetId,
      kind: 'round',
      payload: round,
    };
  }
  if (action.kind === 'profile.patch' || action.kind === 'preferences.patch') {
    if (!validEdit(action.payload))
      throw new Error('An old profile change cannot be converted.');
    const edit = action.payload;
    return {
      id: action.operationId,
      datasetId: action.datasetId,
      kind: 'edit',
      payload: {
        id: action.operationId,
        unit: editUnit[edit.unit],
        value:
          edit.unit === 'training'
            ? convertTraining(edit.value as TrainingConfig)
            : edit.value,
      },
    };
  }
  return null;
}

export async function convertSavedDatabaseV1(
  target: PowerSyncDatabase,
  accountId?: string,
) {
  const [already] = await target.getAll<LocalRow>(
    "SELECT id,payload FROM local_state WHERE id = 'player'",
  );
  if (already) return false;
  const old = openLocalDatabaseV1(accountId);
  try {
    await old.init();
    const [saved] = await old.getAll<LocalRow>(
      "SELECT id,payload FROM local_state WHERE id = 'player'",
    );
    if (!saved) return false;
    const state = parseSavedPlayerStateV1(JSON.parse(saved.payload));
    if (accountId && state.account?.id !== accountId)
      throw new Error('The old account save belongs to another account.');
    const [completions, actions, pending, rounds, closed, failures] =
      await Promise.all([
        old.getAll<LocalRow>('SELECT id,payload FROM local_completions'),
        old.getAll<LocalRow>('SELECT id,payload FROM local_actions'),
        accountId
          ? old.getAll<LocalRow>(
              'SELECT id,payload FROM pending_actions ORDER BY sequence',
            )
          : Promise.resolve([]),
        old.getAll<LocalRow>('SELECT id,payload FROM local_rounds'),
        old.getAll<LocalRow>('SELECT id,payload FROM local_closed_rounds'),
        old.getAll<LocalRow>(
          "SELECT id,payload FROM local_state WHERE id LIKE 'failure:%'",
        ),
      ]);
    const convertedActions = new Map<string, string>();
    for (const row of actions) {
      const action: unknown = JSON.parse(row.payload);
      if (!validAction(action) || action.operationId !== row.id)
        throw new Error('An old browser change cannot be converted.');
      const converted = convertSavedActionV1(action);
      if (converted) convertedActions.set(row.id, JSON.stringify(converted));
    }
    const convertedRounds = completions.map((row) => {
      const receipt = JSON.parse(row.payload) as {
        completion: unknown;
        eligible: boolean;
      };
      const completion = readRecordedGame(receipt.completion);
      if (
        completion.completionId !== row.id ||
        typeof receipt.eligible !== 'boolean'
      )
        throw new Error('An old completed round cannot be converted.');
      return {
        id: row.id,
        payload: JSON.stringify(
          archiveCompletion(completion, receipt.eligible),
        ),
      };
    });
    const roundIds = new Map<string, string>();
    const convertUnfinished = (value: unknown) => {
      const round = parseActiveGameSave(value);
      round.roundId = roundIds.get(round.seed) ?? round.roundId;
      roundIds.set(round.seed, round.roundId);
      if (round.mode.kind !== 'daily' || round.startedOn) return round;
      return { ...round, startedOn: round.mode.date };
    };
    const convertedActive = rounds.map((row) => ({
      id: row.id,
      payload: JSON.stringify(convertUnfinished(JSON.parse(row.payload))),
    }));
    const dailyAttempts = Object.fromEntries(
      Object.entries(state.dailyAttempts).map(([key, value]) => [
        key,
        convertUnfinished(value),
      ]),
    );
    await target.writeTransaction(async (tx) => {
      for (const row of convertedRounds)
        await tx.execute(
          'INSERT INTO local_completions(id,payload) VALUES (?,?)',
          [row.id, row.payload],
        );
      for (const [id, payload] of convertedActions)
        await tx.execute('INSERT INTO local_actions(id,payload) VALUES (?,?)', [
          id,
          payload,
        ]);
      for (const row of pending) {
        const payload = convertedActions.get(row.id);
        if (!payload) continue;
        if ((JSON.parse(payload) as { kind: string }).kind === 'edit')
          await tx.execute('INSERT INTO local_state(id,payload) VALUES (?,?)', [
            `failure:${row.id}`,
            JSON.stringify({ reason: 'needs_review' }),
          ]);
        else
          await tx.execute(
            'INSERT INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
            [row.id, payload],
          );
      }
      for (const [table, rows] of [
        ['local_rounds', convertedActive],
        ['local_closed_rounds', closed],
      ] as const)
        for (const row of rows)
          await tx.execute(`INSERT INTO ${table}(id,payload) VALUES (?,?)`, [
            row.id,
            row.payload,
          ]);
      for (const row of failures)
        await tx.execute(
          'INSERT OR REPLACE INTO local_state(id,payload) VALUES (?,?)',
          [row.id, row.payload],
        );
      const next = {
        version: 2,
        datasetId: state.datasetId,
        save: state.save,
        dailyAttempts,
        ...(state.account
          ? {
              account: {
                id: state.account.id,
                serverEpoch: state.account.serverEpoch,
              },
            }
          : {}),
      };
      await tx.execute(
        "INSERT INTO local_state(id,payload) VALUES ('player',?)",
        [JSON.stringify(next)],
      );
      if (accountId)
        await tx.execute(
          "INSERT INTO local_state(id,payload) VALUES ('account-rebind','true')",
        );
    });
    return true;
  } finally {
    await old.close();
  }
}
