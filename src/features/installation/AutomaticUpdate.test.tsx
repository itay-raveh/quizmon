import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';

const pwa = vi.hoisted(() => ({
  needRefresh: true,
  updateServiceWorker: vi.fn(),
  reload: vi.fn(() => true),
  onNeedReload: undefined as (() => void) | undefined,
}));
vi.mock('@/features/installation/update-session', () => ({
  reloadAfterUpdate: pwa.reload,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: { onNeedReload: () => void }) => {
    pwa.onNeedReload = options.onNeedReload;
    return {
      needRefresh: [pwa.needRefresh],
      updateServiceWorker: pwa.updateServiceWorker,
    };
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  pwa.needRefresh = true;
  pwa.updateServiceWorker.mockReset().mockResolvedValue(undefined);
  pwa.reload.mockReset().mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());

it('waits through gameplay and automatically updates on the next screen without UI', () => {
  const view = render(<AutomaticUpdate allowed={false} />);
  expect(view.container).toBeEmptyDOMElement();
  expect(pwa.updateServiceWorker).not.toHaveBeenCalled();
  view.rerender(<AutomaticUpdate allowed />);
  expect(pwa.updateServiceWorker).toHaveBeenCalledOnce();
  expect(pwa.reload).not.toHaveBeenCalled();
  act(() => pwa.onNeedReload?.());
  expect(pwa.reload).toHaveBeenCalledOnce();
});

it('defers the actual reload if another round starts while activation is pending', () => {
  const view = render(<AutomaticUpdate allowed />);
  view.rerender(<AutomaticUpdate allowed={false} />);
  act(() => pwa.onNeedReload?.());
  expect(pwa.reload).not.toHaveBeenCalled();
  view.rerender(<AutomaticUpdate allowed />);
  expect(pwa.reload).toHaveBeenCalledOnce();
});

it('does not request duplicate updates under Strict Mode or rerenders', () => {
  const view = render(
    <StrictMode>
      <AutomaticUpdate allowed />
    </StrictMode>,
  );
  view.rerender(
    <StrictMode>
      <AutomaticUpdate allowed />
    </StrictMode>,
  );
  expect(pwa.updateServiceWorker).toHaveBeenCalledOnce();
});

it('does nothing when the app is current', () => {
  pwa.needRefresh = false;
  render(<AutomaticUpdate allowed />);
  expect(pwa.updateServiceWorker).not.toHaveBeenCalled();
});

it('retries failed activation automatically', async () => {
  pwa.updateServiceWorker.mockRejectedValueOnce(new Error('Offline'));
  render(<AutomaticUpdate allowed />);
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(pwa.updateServiceWorker).toHaveBeenCalledTimes(2);
});

it('does not reload if preserving the current screen fails', async () => {
  pwa.reload.mockReturnValueOnce(false);
  render(<AutomaticUpdate allowed />);
  act(() => pwa.onNeedReload?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(pwa.reload).toHaveBeenCalledTimes(2);
});
