import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

beforeEach(() => {
  sessionStorage.clear();
  vi.resetModules();
});

it('captures the latest state for this tab and restores it once', async () => {
  const state = await import('@/features/installation/update-session');
  const Draft = () => {
    const [draft, setDraft] = state.useUpdateState('draft', { name: 'Before' });
    return (
      <input
        aria-label="Name"
        value={draft.name}
        onChange={(event) => setDraft({ name: event.target.value })}
      />
    );
  };
  const user = userEvent.setup();
  const hook = render(<Draft />);
  await user.clear(screen.getByRole('textbox', { name: 'Name' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'After');
  expect(state.saveUpdateState()).toBe(true);
  hook.unmount();
  vi.resetModules();
  const restored = await import('@/features/installation/update-session');
  expect(restored.readUpdateState('draft', null)).toEqual({ name: 'After' });
  expect(sessionStorage.getItem('quizmon.update-state.v1')).toBeNull();
  const next = renderHook(() => restored.useUpdateState('draft', { name: '' }));
  expect(next.result.current[0]).toEqual({ name: 'After' });
  next.unmount();
  expect(restored.readUpdateState('draft', null)).toBeNull();
});

it('ignores a snapshot from a different page and malformed storage', async () => {
  sessionStorage.setItem(
    'quizmon.update-state.v1',
    JSON.stringify({
      url: 'https://example.com/another-page',
      values: { draft: 'Wrong page' },
    }),
  );
  const state = await import('@/features/installation/update-session');
  expect(state.readUpdateState('draft', 'Default')).toBe('Default');
  vi.resetModules();
  sessionStorage.setItem('quizmon.update-state.v1', '{broken');
  const invalid = await import('@/features/installation/update-session');
  expect(invalid.readUpdateState('draft', 'Default')).toBe('Default');
});

it('does not keep state from dismissed screens and detects unavailable storage', async () => {
  const state = await import('@/features/installation/update-session');
  const hook = renderHook(() => state.useUpdateState('draft', 'Temporary'));
  hook.unmount();
  expect(state.saveUpdateState()).toBe(true);
  expect(
    (
      JSON.parse(sessionStorage.getItem('quizmon.update-state.v1')!) as {
        values: unknown;
      }
    ).values,
  ).toEqual({});
  const storage = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('Storage blocked');
    });
  expect(state.saveUpdateState()).toBe(false);
  storage.mockRestore();
});

it('saves the current schema and settings without legacy aliases', async () => {
  const state = await import('./update-session');
  const settings = { trainingMode: 'league' };
  renderHook(() =>
    state.useUpdateState('session', { phase: 'questions', settings }),
  );
  expect(state.saveUpdateState()).toBe(true);
  const saved: unknown = JSON.parse(
    sessionStorage.getItem('quizmon.update-state.v1')!,
  );
  expect(saved).toMatchObject({
    saveVersion: 7,
    values: { session: { phase: 'questions', settings } },
  });
});

it('reloads an update during recovery without replacing the preserved save', async () => {
  const raw = '{"saveVersion":8,"values":{"draft":"Keep this"}}';
  sessionStorage.setItem('quizmon.update-state.v1', raw);
  const state = await import('./update-session');
  const health = await import('@/lib/storage/save-health');
  const { SaveError } = await import('@/domain/player/save-schema');
  health.reportSaveIssue(
    new SaveError('newer', 'A newer save needs an update.'),
  );
  expect(state.saveUpdateState()).toBe(false);
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload } });
  try {
    expect(state.reloadAfterUpdate()).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('quizmon.update-state.v1')).toBe(raw);
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each([undefined, 4, 5, 6])(
  'preserves retired reload format %s for recovery',
  async (saveVersion) => {
    const raw = JSON.stringify({
      saveVersion,
      url: window.location.href,
      values: { draft: 'Old draft' },
    });
    sessionStorage.setItem('quizmon.update-state.v1', raw);
    const state = await import('./update-session');
    expect(state.readUpdateState('draft', '')).toBe('');
    expect(sessionStorage.getItem('quizmon.update-state.v1')).toBe(raw);
    expect(state.saveUpdateState()).toBe(false);
  },
);

it('keeps reload state available for recovery until the application can load it', async () => {
  const raw = JSON.stringify({
    saveVersion: 7,
    url: window.location.href,
    values: { draft: 'Keep for recovery' },
  });
  sessionStorage.setItem('quizmon.update-state.v1', raw);
  const state = await import('./update-session');
  const health = await import('@/lib/storage/save-health');
  const { SaveError } = await import('@/domain/player/save-schema');
  health.reportSaveIssue(
    new SaveError('invalid', 'The player save is invalid.'),
  );
  expect(state.readUpdateState('draft', '')).toBe('');
  expect(sessionStorage.getItem('quizmon.update-state.v1')).toBe(raw);
  health.clearSaveIssue();
  expect(state.readUpdateState('draft', '')).toBe('Keep for recovery');
  expect(sessionStorage.getItem('quizmon.update-state.v1')).toBeNull();
});
