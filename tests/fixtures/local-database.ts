import { DatabaseSync } from 'node:sqlite';
import type {
  LocalDatabase,
  LocalTransaction,
} from '../../src/lib/storage/local-database';

export const localTables = [
  'local_state',
  'local_actions',
  'local_completions',
  'local_rounds',
  'local_closed_rounds',
] as const;
export const openLocalDatabase = (): LocalDatabase => {
  const sqlite = new DatabaseSync(':memory:');
  const listeners = new Set<() => void>();
  let writes = Promise.resolve();
  const transaction: LocalTransaction = {
    getAll: <T>(sql: string, parameters: unknown[] = []) =>
      Promise.resolve(
        sqlite
          .prepare(sql)
          .all(...(parameters as (string | number | null)[])) as T[],
      ),
    execute: (sql, parameters = []) =>
      Promise.resolve(
        sqlite.prepare(sql).run(...(parameters as (string | number | null)[])),
      ),
  };
  const runTransaction = <T>(
    callback: (tx: LocalTransaction) => Promise<T>,
  ) => {
    const next = writes.then(async () => {
      sqlite.exec('BEGIN');
      try {
        const value = await callback(transaction);
        sqlite.exec('COMMIT');
        listeners.forEach((listener) => listener());
        return value;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    });
    writes = next.then(
      () => {},
      () => {},
    );
    return next;
  };
  return {
    ...transaction,
    init: () => {
      for (const table of localTables)
        sqlite.exec(
          `CREATE TABLE ${table}(id TEXT PRIMARY KEY, payload TEXT NOT NULL)`,
        );
      return Promise.resolve();
    },
    readTransaction: runTransaction,
    writeTransaction: runTransaction,
    onChange: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
};
