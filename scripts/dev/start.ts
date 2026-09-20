import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { emailMode, envFile, requiredMailSetting } from './local-env.ts';

const preview = process.argv.includes('--preview');
const origin = `http://127.0.0.1:${preview ? 4173 : 5173}`;
const children: ChildProcess[] = [];
let stopping = false;
const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with ${code}`)),
    );
  });
const launch = (command: string, args: string[]) => {
  const child = spawn(command, args, { stdio: 'inherit', detached: true });
  children.push(child);
  return child;
};
async function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* The process already exited. */
    }
  }
  await run('docker', ['compose', 'stop']);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void stop().catch(console.error);
  });
try {
  await run('docker', ['compose', 'up', '-d', '--wait', 'db']);
  await run('npm', ['run', 'db:migrate']);
  if (preview) await run('npm', ['run', 'build']);
  const api = launch('node_modules/.bin/wrangler', [
    'dev',
    '--config',
    'deploy/wrangler.dev.jsonc',
    ...(emailMode === 'cloudflare'
      ? [
          '--env',
          'cloudflare',
          '--var',
          `MAIL_FROM:${requiredMailSetting('MAIL_FROM')}`,
        ]
      : ['--local']),
    '--var',
    `AUTH_ORIGIN:${origin}`,
    '--ip',
    '0.0.0.0',
    '--port',
    '8790',
    '--env-file',
    fileURLToPath(envFile),
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 120 && !stopping; attempt++) {
    if (api.exitCode !== null) throw new Error('The account API stopped.');
    try {
      ready = (
        await fetch('http://127.0.0.1:8790/api/account/config', {
          signal: AbortSignal.timeout(5000),
        })
      ).ok;
      if (ready) break;
    } catch {
      /* Wrangler is starting. */
    }
    await setTimeout(500);
  }
  if (!ready || stopping)
    throw new Error('The account API did not become ready.');
  await run('docker', ['compose', 'up', '-d', 'powersync']);
  const browser = launch(
    'npm',
    preview
      ? [
          'run',
          'preview',
          '--',
          '--host',
          '127.0.0.1',
          '--port',
          '4173',
          '--strictPort',
        ]
      : ['run', 'dev:client'],
  );
  console.log(
    `Open ${origin}. Ctrl+C stops local services and preserves their data.`,
  );
  await new Promise<void>((resolve, reject) => {
    for (const child of [api, browser]) {
      child.once('error', reject);
      child.once('exit', (code) =>
        stopping || code === 0
          ? resolve()
          : reject(new Error(`Development process exited with ${code}`)),
      );
    }
  });
} finally {
  await stop();
}
