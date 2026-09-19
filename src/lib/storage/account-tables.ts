import { column, Table } from '@powersync/web';

export const accountTables = {
  completion_facts: new Table(
    {
      owner_id: column.text,
      generation_id: column.text,
      completion_id: column.text,
      revision: column.integer,
      eligible: column.integer,
      completion: column.text,
    },
    {
      indexes: {
        history: ['generation_id', 'revision'],
        completion: ['generation_id', 'completion_id'],
      },
    },
  ),
  account_state: new Table({
    generation_id: column.text,
    revision: column.integer,
    progress: column.text,
    edits: column.text,
    edit_revisions: column.text,
    profile_created_at: column.text,
  }),
  player_pokemon: new Table({
    owner_id: column.text,
    generation_id: column.text,
    pokemon: column.text,
    discovered: column.integer,
    correct: column.integer,
  }),
  daily_results: new Table({
    owner_id: column.text,
    generation_id: column.text,
    date: column.text,
    completion_id: column.text,
    result: column.text,
    streak_credit: column.integer,
  }),
  training_bests: new Table({
    owner_id: column.text,
    generation_id: column.text,
    mode: column.text,
    score_version: column.integer,
    completion_id: column.text,
    result: column.text,
  }),
  hall_of_fame: new Table({
    owner_id: column.text,
    generation_id: column.text,
    completion_id: column.text,
    completed_at: column.text,
    trainer_name: column.text,
    pokemon: column.text,
    result: column.text,
  }),
  sync_issues: new Table({
    owner_id: column.text,
    generation_id: column.text,
    operation_id: column.text,
    reason: column.text,
    payload: column.text,
    dismissed: column.integer,
  }),
  pending_actions: new Table({
    payload: column.text,
    sequence: column.integer,
  }),
};
