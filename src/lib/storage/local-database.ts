import { column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import { accountTables } from './account-tables';

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
export interface LocalTransaction {
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
}
export interface LocalDatabase extends LocalTransaction {
  init(): Promise<void>;
  readTransaction<T>(
    callback: (transaction: LocalTransaction) => Promise<T>,
  ): Promise<T>;
  writeTransaction<T>(
    callback: (transaction: LocalTransaction) => Promise<T>,
  ): Promise<T>;
  onChange(callback: () => void): () => void;
}

const instances = new WeakMap<LocalDatabase, PowerSyncDatabase>();
export const getPowerSyncDatabase = (database: LocalDatabase) => {
  const instance = instances.get(database);
  if (!instance) throw new Error('This save has no sync connection.');
  return instance;
};
export const openLocalDatabase = (accountId?: string): LocalDatabase => {
  const db = new PowerSyncDatabase({
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
        : 'quizmon-guest-v2.sqlite',
    },
  });
  const database: LocalDatabase = {
    init: () => db.init(),
    getAll: (sql, parameters) => db.getAll(sql, parameters),
    execute: (sql, parameters) => db.execute(sql, parameters),
    readTransaction: (callback) => db.readTransaction(callback),
    writeTransaction: (callback) => db.writeTransaction(callback),
    onChange: (callback) =>
      db.onChange({ onChange: callback }, { tables: ['local_state'] }),
  };
  instances.set(database, db);
  return database;
};
