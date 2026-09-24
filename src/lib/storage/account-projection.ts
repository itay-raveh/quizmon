import { projectRoundHistory } from '../../domain/player/game-history';
import { createTrainerProfile } from '../../domain/player/trainer-profile';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { validateRoundFact } from '../../domain/sync/round-facts';
import { isRecord } from '../validation';
import { readLocalRounds } from './game-history';
import type { LocalRow, LocalTransaction } from './local-database';
import type { LocalAction, LocalPlayerState } from './player-storage';

function array(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    return value;
  if (typeof value === 'string') {
    try {
      return array(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export async function projectAccount(
  state: LocalPlayerState,
  tx: LocalTransaction,
) {
  if (!state.account) return;
  const [player] = await tx.getAll<Record<string, unknown>>(
    'SELECT * FROM player WHERE id = ?',
    [state.account.id],
  );
  const local = await readLocalRounds(tx);
  const failures = await tx.getAll<{ id: string }>(
    "SELECT id FROM local_state WHERE id LIKE 'failure:%'",
  );
  const rejected = new Set(failures.map(({ id }) => id.slice(8)));
  const rows = await tx.getAll<Record<string, unknown>>(
    'SELECT * FROM round WHERE player_id = ?',
    [state.account.id],
  );
  const rounds = new Map(
    local
      .filter((round) => !rejected.has(round.id))
      .map((round) => [round.id, round]),
  );
  for (const row of rows) {
    const archive: unknown =
      typeof row.data === 'string'
        ? (JSON.parse(row.data) as unknown)
        : row.data;
    const round: unknown = {
      id: row.id,
      mode: row.mode,
      day: row.day,
      puzzle_id: row.puzzle_id,
      started_on: row.started_on,
      completed_at:
        typeof row.completed_at === 'string'
          ? new Date(row.completed_at).toISOString()
          : row.completed_at,
      credited: row.credited === true || row.credited === 1,
      data: archive,
    };
    if (!validateRoundFact(round))
      throw new Error('A downloaded round is invalid.');
    rounds.set(round.id, round);
  }
  const ordered = [...rounds.values()].sort(
    (a, b) =>
      a.completed_at.localeCompare(b.completed_at) || a.id.localeCompare(b.id),
  );
  const data = structuredClone(state.save.data);
  Object.assign(data, projectRoundHistory(ordered));
  if (!player) {
    state.save.data = data;
    return;
  }
  const profile = (data.profile = {
    ...(data.profile ?? createTrainerProfile()),
    createdAt: String(player.joined_on),
    name: typeof player.name === 'string' ? player.name : '',
    avatar: typeof player.avatar === 'string' ? player.avatar : null,
    partnerPokemon: typeof player.partner === 'string' ? player.partner : null,
    specialty: typeof player.specialty === 'string' ? player.specialty : null,
  } as NonNullable<typeof data.profile>);
  const settings = (data.settings = {
    ...defaultGameSettings,
    ...data.settings,
    answerFlow: player.answer_flow,
    timerDisplay: player.timer_display,
    trainingMode: player.training_mode,
    difficulty: Number(player.difficulty),
    questionSelection: player.question_selection,
    generations: array(player.generations),
    formGroups: array(player.form_groups),
    questionTypes: array(player.question_types),
    automaticQuestionTypes:
      player.auto_types == null ? undefined : array(player.auto_types),
  } as NonNullable<typeof data.settings>);
  const pending = await tx.getAll<LocalRow>(
    "SELECT id,payload FROM pending_actions WHERE id NOT IN (SELECT substr(id,9) FROM local_state WHERE id LIKE 'failure:%') ORDER BY sequence",
  );
  for (const row of pending) {
    const action = JSON.parse(row.payload) as LocalAction;
    if (
      action.kind !== 'edit' ||
      action.id !== row.id ||
      !isRecord(action.payload)
    )
      continue;
    const { unit, value } = action.payload;
    if (unit === 'name') profile.name = value as string;
    if (unit === 'avatar') profile.avatar = value as typeof profile.avatar;
    if (unit === 'partner')
      profile.partnerPokemon = value as typeof profile.partnerPokemon;
    if (unit === 'specialty')
      profile.specialty = value as typeof profile.specialty;
    if (unit === 'answer_flow')
      settings.answerFlow = value as typeof settings.answerFlow;
    if (unit === 'timer_display')
      settings.timerDisplay = value as typeof settings.timerDisplay;
    if (unit === 'training' && isRecord(value))
      Object.assign(settings, {
        trainingMode: value.training_mode,
        difficulty: value.difficulty,
        questionSelection: value.question_selection,
        generations: value.generations,
        formGroups: value.form_groups,
        questionTypes: value.question_types,
        automaticQuestionTypes: value.auto_types ?? undefined,
      });
  }
  state.save.data = data;
}
