import { column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import { accountTables } from './account-tables';
import { accountTables as accountTablesV1 } from './account-tables-v1';
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
const openDatabase = (
  accountId?: string,
  version: 1 | 2 = 2,
): PowerSyncDatabase =>
  new PowerSyncDatabase({
    schema: new Schema({
      ...(accountId ? (version === 1 ? accountTablesV1 : accountTables) : {}),
      ...Object.fromEntries(
        localTables.map((name) => [
          name,
          new Table({ payload: column.text }, { localOnly: true }),
        ]),
      ),
    }),
    database: {
      dbFilename: accountId
        ? `quizmon-account-${encodeURIComponent(accountId)}-${version === 1 ? 'baseline' : 'v2'}.sqlite`
        : `quizmon-guest-${version === 1 ? 'baseline' : 'v2'}.sqlite`,
    },
  });

export const openLocalDatabase = (accountId?: string) =>
  openDatabase(accountId);
export const openLocalDatabaseV1 = (accountId?: string) =>
  openDatabase(accountId, 1);
