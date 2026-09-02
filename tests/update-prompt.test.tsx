import { render, screen } from '@testing-library/react';
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
});
