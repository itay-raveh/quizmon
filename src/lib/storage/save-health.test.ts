import { expect, it, vi } from 'vitest';
import { SaveError } from '../../domain/player/save-schema';

const sentry = vi.hoisted(() => ({ captureUnexpectedError: vi.fn() }));
vi.mock('../sentry', () => ({
  captureUnexpectedError: sentry.captureUnexpectedError,
}));
vi.mock('../analytics', () => ({ trackFailure: vi.fn() }));

import { clearSaveIssue, getSaveIssue, reportSaveIssue } from './save-health';

it('reports the original unavailable-storage error without exposing it in the dialog', () => {
  const cause = new DOMException('Private browser detail', 'SecurityError');
  reportSaveIssue(cause);

  expect(getSaveIssue()).toEqual({
    kind: 'unavailable',
    message: 'Your browser could not access saved data.',
  });
  expect(sentry.captureUnexpectedError).toHaveBeenCalledWith(
    'save.unavailable',
    cause,
  );

  clearSaveIssue();
  sentry.captureUnexpectedError.mockClear();
  reportSaveIssue(new SaveError('newer', 'A newer save'));
  expect(sentry.captureUnexpectedError).not.toHaveBeenCalled();
  clearSaveIssue();
});
