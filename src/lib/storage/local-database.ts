import { column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import { accountTables } from './account-tables';
export type LocalTransaction = Pick<PowerSyncDatabase, 'getAll' | 'execute'>;

export const localTables = [
  'local_state',
  'local_actions',
  'local_completions',
  'local_rounds',
  'local_closed_rounds',
] as const;
export interface LocalRow {
  id: string;
  payload: string;
}
export const openLocalDatabase = (accountId?: string): PowerSyncDatabase =>
  new PowerSyncDatabase({
    schema: new Schema({
      ...(accountId ? accountTables : {}),
      ...Object.fromEntries(
        localTables.map((name) => [
          name,
          new Table({ payload: column.text }, { localOnly: true }),
        ]),
      ),
    }),
    database: {
      dbFilename: accountId
        ? `quizmon-account-${encodeURIComponent(accountId)}-v2.sqlite`
        : `quizmon-guest-v2.sqlite`,
    },
  });
