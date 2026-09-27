import { expect, it, vi } from 'vitest';
import { SaveError } from '../../domain/player/save-schema';

const sentry = vi.hoisted(() => ({ captureUnexpectedError: vi.fn() }));
vi.mock('../sentry', () => ({
  captureUnexpectedError: sentry.captureUnexpectedError,
}));
vi.mock('../analytics', () => ({ trackFailure: vi.fn() }));

import { getSaveError, reportSaveError } from './player-storage';

it('shows only safe save errors while reporting unexpected failures privately', () => {
  const cause = new Error('private IndexedDB details');
  reportSaveError(cause);
  expect(getSaveError()).toBe('Your browser could not save your progress.');
  expect(sentry.captureUnexpectedError).toHaveBeenCalledWith(
    'save.write',
    cause,
  );

  reportSaveError(new SaveError('invalid', 'This save is invalid.'));
  expect(getSaveError()).toBe('This save is invalid.');
});
