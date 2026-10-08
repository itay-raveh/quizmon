import { Worker } from 'node:worker_threads';
import type { TrainerProfile } from '../src/domain/player/trainer-profile.ts';
import type { projectTrainerHistory } from './rxdb-read.ts';

export interface ProjectionInput {
  profile: unknown;
  rounds: unknown[];
  detail: boolean;
}

export interface ProjectionOutput {
  profile: TrainerProfile;
  leagueCompleted: boolean;
  detail?: ReturnType<typeof projectTrainerHistory>;
  roundCount: number;
  validationMs: number;
  projectionMs: number;
  heapBytes: number;
}

export type ProjectionMessage =
  | { type: 'ready' | 'started' | 'invalid' }
  | { type: 'result'; value: ProjectionOutput };

interface ProjectionWorker {
  worker: Worker;
  ready: ReturnType<typeof Promise.withResolvers<void>>;
  pending?: ReturnType<typeof Promise.withResolvers<ProjectionOutput>>;
}

const unavailable = () =>
  Object.assign(new Error('Trainer projection worker is unavailable.'), {
    status: 503,
    retryAfter: '1',
  });

export function createTrainerProjector(
  createWorker = () =>
    new Worker(new URL('./trainer-projection-worker.ts', import.meta.url), {
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    }),
) {
  let current: ProjectionWorker | undefined;
  let retiring: Promise<unknown> = Promise.resolve();
  let closed = false;

  const start = async () => {
    await retiring;
    if (closed) throw unavailable();
    if (current) return current;
    const worker = createWorker();
    const ready = Promise.withResolvers<void>();
    const instance: ProjectionWorker = { worker, ready };
    current = instance;
    const fail = () => {
      if (current !== instance) return;
      current = undefined;
      ready.reject(unavailable());
      instance.pending?.reject(unavailable());
      retiring = worker.terminate();
    };
    const startup = setTimeout(fail, 10_000);
    worker.on('message', (message: ProjectionMessage) => {
      if (current !== instance) return;
      if (message.type === 'ready') {
        clearTimeout(startup);
        ready.resolve();
      } else if (message.type === 'result')
        instance.pending?.resolve(message.value);
      else if (message.type === 'invalid')
        instance.pending?.reject(
          new Error('Trainer facts validation or projection failed.'),
        );
    });
    worker.on('error', fail);
    worker.on('exit', () => {
      clearTimeout(startup);
      fail();
    });
    return instance;
  };

  return {
    async ready() {
      await (
        await start()
      ).ready.promise;
    },
    async run(input: ProjectionInput) {
      const instance = await start();
      await instance.ready.promise;
      if (closed || current !== instance || instance.pending)
        throw unavailable();
      const pending = Promise.withResolvers<ProjectionOutput>();
      instance.pending = pending;
      const deadline = setTimeout(() => {
        if (current !== instance) return;
        current = undefined;
        pending.reject(unavailable());
        retiring = instance.worker.terminate();
      }, 10_000);
      try {
        const started = performance.now();
        instance.worker.postMessage(input);
        const dispatchMs = performance.now() - started;
        return { ...(await pending.promise), dispatchMs };
      } finally {
        clearTimeout(deadline);
        instance.pending = undefined;
      }
    },
    async close() {
      closed = true;
      const instance = current;
      current = undefined;
      instance?.ready.reject(unavailable());
      instance?.pending?.reject(unavailable());
      if (instance) retiring = instance.worker.terminate();
      await retiring;
    },
  };
}
