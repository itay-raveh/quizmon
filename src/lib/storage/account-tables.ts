import { column, Table } from '@powersync/web';

export const accountTables = {
  player: new Table({
    code: column.text,
    joined_on: column.text,
    name: column.text,
    avatar: column.text,
    partner: column.text,
    specialty: column.text,
    answer_flow: column.text,
    timer_display: column.text,
    training_mode: column.text,
    difficulty: column.integer,
    question_selection: column.text,
    generations: column.text,
    form_groups: column.text,
    question_types: column.text,
    auto_types: column.text,
  }),
  round: new Table(
    {
      player_id: column.text,
      mode: column.text,
      day: column.text,
      puzzle_id: column.text,
      started_on: column.text,
      completed_at: column.text,
      credited: column.integer,
      data: column.text,
    },
    { indexes: { history: ['player_id', 'completed_at'] } },
  ),
  pending_actions: new Table({
    payload: column.text,
    sequence: column.integer,
  }),
};
