import type { RxStorage } from 'rxdb';
import type { Collection } from 'mongodb';
import type { CachedTrainer } from './trainer-summaries.ts';

const unavailable = (cause?: unknown) =>
  Object.assign(
    new Error('Trainer summary freshness is unavailable.', { cause }),
    {
      status: 503,
      retryAfter: '1',
    },
  );

/** One origin owns fact writes. Raw database maintenance requires a stopped origin. */
export function createTrainerSummaryWrites(cache: Collection<CachedTrainer>) {
  const io = { timeoutMS: 1_000 };
  const owners = new Map<
    string,
    {
      generation: number;
      writes: Set<Promise<void>>;
      publication: Promise<void>;
    }
  >();
  let failed = false;
  const state = (owner: string) => {
    let value = owners.get(owner);
    if (!value) {
      value = {
        generation: 0,
        writes: new Set(),
        publication: Promise.resolve(),
      };
      owners.set(owner, value);
    }
    return value;
  };
  const check = () => {
    if (failed) throw unavailable();
  };
  const locked = <T>(owner: string, run: () => Promise<T>) => {
    const value = state(owner);
    const result = value.publication.then(run);
    value.publication = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  const settled = async (ids?: string[]) => {
    while (true) {
      check();
      const pending = [...(ids ? ids.map(state) : owners.values())].flatMap(
        (value) => [...value.writes],
      );
      if (!pending.length) return;
      await Promise.all(pending);
    }
  };
  return {
    settled,
    healthy: () => !failed,
    async snapshot(ids: string[]) {
      await settled(ids);
      return ids.map((id) => state(id).generation);
    },
    current(ids: string[], generations: number[]) {
      check();
      return ids.every(
        (id, index) =>
          state(id).generation === generations[index] &&
          state(id).writes.size === 0,
      );
    },
    publish(owner: string, generation: number, value: CachedTrainer) {
      return locked(owner, async () => {
        check();
        if (state(owner).generation !== generation || state(owner).writes.size)
          return false;
        try {
          await cache.updateOne(
            { _id: owner },
            { $set: value },
            { ...io, upsert: true },
          );
          if (
            state(owner).generation === generation &&
            !state(owner).writes.size
          )
            return true;
          await cache.deleteOne({ _id: owner }, io);
          return false;
        } catch (error) {
          // An ambiguous publication may have reached Mongo. Never leave it reusable.
          try {
            await cache.deleteOne({ _id: owner }, io);
          } catch {
            failed = true;
          }
          throw error;
        }
      });
    },
    wrapStorage(
      storage: RxStorage<unknown, unknown>,
    ): RxStorage<unknown, unknown> {
      return {
        ...storage,
        async createStorageInstance(params) {
          const instance = await storage.createStorageInstance(params);
          if (
            params.collectionName !== 'players' &&
            params.collectionName !== 'rounds'
          )
            return instance;
          const bulkWrite = instance.bulkWrite.bind(instance);
          instance.bulkWrite = async (rows, context) => {
            check();
            const affected = new Set<string>();
            for (const row of rows) {
              for (const document of [row.document, row.previous]) {
                if (!document) continue;
                const owner = (document as Record<string, unknown>)[
                  params.collectionName === 'players' ? 'id' : 'ownerId'
                ];
                if (typeof owner !== 'string' || !owner) throw unavailable();
                affected.add(owner);
              }
            }
            const done = Promise.withResolvers<void>();
            for (const owner of affected) {
              const value = state(owner);
              value.generation++;
              value.writes.add(done.promise);
            }
            try {
              try {
                return await bulkWrite(rows, context);
              } catch (error) {
                // Mongo bulk writes can partially commit before throwing. Recovery is a restart.
                failed = true;
                throw unavailable(error);
              } finally {
                await Promise.all(
                  [...affected].map((owner) =>
                    locked(owner, async () => {
                      try {
                        await cache.deleteOne({ _id: owner }, io);
                      } catch (error) {
                        failed = true;
                        throw unavailable(error);
                      }
                    }),
                  ),
                );
              }
            } finally {
              for (const owner of affected)
                state(owner).writes.delete(done.promise);
              done.resolve();
            }
          };
          return instance;
        },
      };
    },
  };
}

export type TrainerSummaryWrites = ReturnType<
  typeof createTrainerSummaryWrites
>;
