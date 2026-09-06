import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from '@/components/UpdatePrompt';

const pwa = vi.hoisted(() => ({
  needRefresh: true,
  updateServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}));

describe('PWA update prompt', () => {
  beforeEach(() => {
    pwa.needRefresh = true;
    pwa.updateServiceWorker.mockReset();
  });

  it('updates only when the notice is visible and selected', async () => {
    const user = userEvent.setup();
    const rendered = render(<UpdatePrompt visible={false} />);

    expect(screen.queryByText('Update ready')).not.toBeInTheDocument();

    rendered.rerender(<UpdatePrompt visible />);
    await user.click(screen.getByRole('button', { name: 'Update now' }));

    expect(pwa.updateServiceWorker).toHaveBeenCalledOnce();
  });

  it('acknowledges the click and stays busy until the worker reloads the page', async () => {
    const user = userEvent.setup();
    const request = Promise.withResolvers<void>();
    pwa.updateServiceWorker.mockReturnValue(request.promise);
    render(<UpdatePrompt visible />);

    await user.click(screen.getByRole('button', { name: 'Update now' }));
    const updating = screen.getByRole('button', { name: 'Updating…' });
    expect(updating).toBeDisabled();
    expect(updating).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Applying update…');
    await user.click(updating);
    expect(pwa.updateServiceWorker).toHaveBeenCalledOnce();

    await act(async () => {
      request.resolve();
      await request.promise;
    });
    expect(updating).toBeDisabled();
  });

  it('offers a retry when starting the update fails', async () => {
    const user = userEvent.setup();
    pwa.updateServiceWorker.mockRejectedValueOnce(new Error('Update failed'));
    render(<UpdatePrompt visible />);

    await user.click(screen.getByRole('button', { name: 'Update now' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      "Update couldn't start. Try again.",
    );
    await user.click(screen.getByRole('button', { name: 'Update now' }));
    expect(pwa.updateServiceWorker).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled();
  });
});
