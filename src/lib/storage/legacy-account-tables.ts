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
