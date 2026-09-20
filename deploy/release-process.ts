import { spawn } from 'node:child_process';
import {
  ActivationNotStartedError,
  PendingActivationError,
} from './release-coordinator.ts';

export async function runReleaseProcess(options: {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  signal: AbortSignal;
  timeoutMs: number;
}) {
  if (
    process.platform !== 'linux' ||
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs <= 0 ||
    options.timeoutMs > 2_147_483_647
  )
    throw new ActivationNotStartedError();
  if (options.signal.aborted) throw new ActivationNotStartedError();
  await new Promise<void>((resolve, reject) => {
    let failed = false;
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      // Generated Worker types also require their bindings in Node ProcessEnv.
      env: options.env as NodeJS.ProcessEnv,
      stdio: 'ignore',
      detached: true,
    });
    const stop = () => {
      failed = true;
      // Wrangler and its children must stop before the release lock can be released.
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* The process may already have exited. */
        }
      }
    };
    const timer = setTimeout(stop, options.timeoutMs);
    options.signal.addEventListener('abort', stop, { once: true });
    child.once('error', () => {
      failed = true;
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      options.signal.removeEventListener('abort', stop);
      if (failed || code !== 0) reject(new PendingActivationError());
      else resolve();
    });
    if (options.signal.aborted) stop();
  });
}
