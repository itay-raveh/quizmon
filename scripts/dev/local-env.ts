import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const directory = new URL('../../.wrangler/accounts/', import.meta.url);
export const envFile = new URL('local.env', directory);
await mkdir(directory, { recursive: true, mode: 0o700 });
try {
  await writeFile(
    envFile,
    `BETTER_AUTH_SECRET=${randomBytes(32).toString('hex')}\n`,
    { flag: 'wx', mode: 0o600 },
  );
} catch (error) {
  if (
    !(error instanceof Error) ||
    !('code' in error) ||
    error.code !== 'EEXIST'
  )
    throw error;
}
export const localEnv = parseEnv(await readFile(envFile, 'utf8'));
export const emailMode = process.env.QUIZMON_EMAIL_DELIVERY ?? 'test-mailbox';
if (!['test-mailbox', 'cloudflare'].includes(emailMode))
  throw new Error('QUIZMON_EMAIL_DELIVERY must be test-mailbox or cloudflare.');

export function requiredMailSetting(name: string) {
  const value = process.env[name] ?? localEnv[name];
  if (!value)
    throw new Error(
      `Set ${name} in .wrangler/accounts/local.env or the environment.`,
    );
  return value;
}
