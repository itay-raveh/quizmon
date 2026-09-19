import {
  applyRecordedGame,
  projectGameHistory,
  progressProjectionVersion,
  readRecordedGame,
  type GameProgress,
} from '../../domain/player/game-history';
import { parsePlayerSave } from '../../domain/player/player-save';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import {
  type Action,
  type EditUnit,
  type RoundCompletion,
  validAction,
  validDiscoveries,
  validEdit,
} from '../../domain/sync/progress';
import type { LocalTransaction } from './local-database';
import type { LocalPlayerState } from './player-storage';

export async function projectAccount(
  state: LocalPlayerState,
  tx: LocalTransaction,
) {
  if (!state.account) return;
  const [base] = await tx.getAll<{
    generation_id: string;
    edits: string;
    edit_revisions: string;
    profile_created_at: string;
  }>(
    'SELECT generation_id,edits,edit_revisions,profile_created_at FROM account_state WHERE id = ?',
    [state.account.id],
  );
  if (!base) return;
  if (base.generation_id !== state.account.generationId)
    throw new Error(
      'This account was reset. Your pending progress is still saved here.',
    );
  const data = structuredClone(state.save.data);
  const [clock] = await tx.getAll<{ revision: number; count: number }>(
    'SELECT COALESCE(MAX(revision),0) AS revision,COUNT(*) AS count FROM completion_facts WHERE generation_id = ?',
    [state.account.generationId],
  );
  const signature = `${progressProjectionVersion}:${state.account.generationId}:${clock!.revision}:${clock!.count}`;
  const [cached] = await tx.getAll<{ payload: string }>(
    "SELECT payload FROM local_state WHERE id = 'history-projection'",
  );
  const cache = cached
    ? (JSON.parse(cached.payload) as {
        signature: string;
        progress: GameProgress;
      })
    : undefined;
  let progress: GameProgress;
  if (cache?.signature === signature) progress = cache.progress;
  else {
    const games = await tx.getAll<{ completion: string; eligible: number }>(
      'SELECT completion,eligible FROM completion_facts WHERE generation_id = ? ORDER BY revision',
      [state.account.generationId],
    );
    progress = projectGameHistory(
      games.map((row) => ({
        completion: readRecordedGame(JSON.parse(row.completion)),
        eligible: Boolean(row.eligible),
      })),
    );
    await tx.execute(
      "INSERT OR REPLACE INTO local_state(id,payload) VALUES ('history-projection',?)",
      [JSON.stringify({ signature, progress })],
    );
  }
  Object.assign(data, structuredClone(progress));
  const pokemon = await tx.getAll<{ pokemon: string; discovered: number }>(
    'SELECT pokemon,discovered FROM player_pokemon WHERE generation_id = ?',
    [state.account.generationId],
  );
  data.pokedex = [
    ...new Set([
      ...data.pokedex,
      ...pokemon.filter((p) => p.discovered).map((p) => p.pokemon),
    ]),
  ];
  data.profile = {
    ...(data.profile ?? createTrainerProfile()),
    createdAt: base.profile_created_at,
  };
  const edits = JSON.parse(base.edits) as Record<string, unknown>;
  state.editRevisions = JSON.parse(base.edit_revisions) as Partial<
    Record<EditUnit, number>
  >;
  const predecessors: LocalPlayerState['predecessors'] = {};
  const rows = await tx.getAll<{ id: string; payload: string }>(
    "SELECT id,payload FROM pending_actions WHERE id NOT IN (SELECT substr(id,9) FROM local_state WHERE id LIKE 'failure:%') AND id NOT IN (SELECT operation_id FROM sync_issues WHERE owner_id = ? AND generation_id = ?) ORDER BY sequence",
    [state.account.id, state.account.generationId],
  );
  for (const row of rows) {
    const action: unknown = JSON.parse(row.payload);
    if (
      !validAction(action) ||
      action.generationId !== state.account.generationId
    )
      throw new Error('A pending change belongs to another save.');
    const recorded =
      action.kind === 'completion.record'
        ? await tx.getAll<{ id: string }>(
            'SELECT id FROM completion_facts WHERE generation_id = ? AND completion_id = ?',
            [
              state.account.generationId,
              (action.payload as RoundCompletion).completionId,
            ],
          )
        : [];
    if (!recorded.length) applyPending(data, edits, action);
    if (validEdit(action.payload))
      predecessors[action.payload.unit] = action.operationId;
  }
  for (const unit of ['name', 'partnerPokemon', 'specialty'] as const)
    if (Object.hasOwn(edits, unit))
      Object.assign(data.profile, { [unit]: edits[unit] });
  data.settings = { ...defaultGameSettings, ...data.settings };
  for (const unit of ['answerFlow', 'timerDisplay'] as const)
    if (Object.hasOwn(edits, unit))
      Object.assign(data.settings, { [unit]: edits[unit] });
  if (edits.training) Object.assign(data.settings, edits.training);
  state.predecessors = predecessors;
  state.save = parsePlayerSave({ ...state.save, data });
}

function applyPending(
  data: LocalPlayerState['save']['data'],
  edits: Record<string, unknown>,
  action: Action,
) {
  if (action.kind === 'completion.record') {
    const round = action.payload as RoundCompletion;
    const eligible =
      round.mode !== 'daily' ||
      !Object.keys(data.results.daily).some(
        (key) => key.split(':')[0] === round.dailyDate,
      );
    applyRecordedGame(data, { completion: round, eligible });
  } else if (
    action.kind === 'discoveries.add' &&
    validDiscoveries(action.payload)
  ) {
    data.pokedex = [...new Set([...data.pokedex, ...action.payload.pokemon])];
  } else if (validEdit(action.payload))
    edits[action.payload.unit] = action.payload.value;
}
