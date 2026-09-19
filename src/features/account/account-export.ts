import { formatVersions } from '../../domain/versions';
import { isRecord } from '../../lib/validation';
import { accountSnapshot } from './account';

export async function downloadAccountExport() {
  const owner = accountSnapshot().owner;
  if (!owner) throw new Error('Sign in to export account data.');
  const response = await fetch('/api/account/export', {
    credentials: 'same-origin',
    signal: AbortSignal.timeout(65_000),
  });
  if (!response.ok)
    throw new Error(
      'Account export failed. Check your connection and sign-in, then try again.',
    );
  const blob = await response.blob();
  let value: unknown;
  try {
    value = JSON.parse(await blob.text());
  } catch {
    throw new Error('The account export was incomplete. Try again.');
  }
  if (
    !isRecord(value) ||
    value.format !== 'quizmon-account-export' ||
    value.version !== formatVersions.accountExport ||
    value.accountId !== owner ||
    accountSnapshot().owner !== owner
  )
    throw new Error(
      'Account changed or the export could not be verified. Try again.',
    );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'quizmon-account.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
