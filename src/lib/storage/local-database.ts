import { column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import { accountTables } from './account-tables';
import { accountTables as legacyAccountTables } from './legacy-account-tables';
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
const openDatabase = (accountId?: string, legacy = false): PowerSyncDatabase =>
  new PowerSyncDatabase({
    schema: new Schema({
      ...(accountId ? (legacy ? legacyAccountTables : accountTables) : {}),
      ...Object.fromEntries(
        localTables.map((name) => [
          name,
          new Table({ payload: column.text }, { localOnly: true }),
        ]),
      ),
    }),
    database: {
      dbFilename: accountId
        ? `quizmon-account-${encodeURIComponent(accountId)}-${legacy ? 'baseline' : 'v2'}.sqlite`
        : `quizmon-guest-${legacy ? 'baseline' : 'v2'}.sqlite`,
    },
  });

export const openLocalDatabase = (accountId?: string) =>
  openDatabase(accountId);
export const openLegacyLocalDatabase = (accountId?: string) =>
  openDatabase(accountId, true);
