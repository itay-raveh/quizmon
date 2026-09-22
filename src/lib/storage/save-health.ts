import { SaveError, type SaveErrorKind } from '../../domain/player/save-schema';
import { trackFailure } from '../analytics';

export interface SaveIssue {
  kind: SaveErrorKind;
  message: string;
}

let issue: SaveIssue | null = null;
const listeners = new Set<() => void>();
const notify = () =>
  queueMicrotask(() => listeners.forEach((listener) => listener()));

export const getSaveIssue = (): SaveIssue | null => issue;
export const subscribeToSaveIssue = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const reportSaveIssue = (error: unknown): SaveError => {
  const failure =
    error instanceof SaveError
      ? error
      : error instanceof SyntaxError
        ? new SaveError('invalid', 'The saved data is not valid JSON.')
        : new SaveError(
            'unavailable',
            'Your browser could not access saved data.',
          );
  if (!issue) {
    issue = { kind: failure.kind, message: failure.message };
    trackFailure(`save.${failure.kind}`);
    notify();
  }
  return failure;
};
export const clearSaveIssue = (): void => {
  issue = null;
  notify();
};
