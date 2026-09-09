import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameButton } from './GameButton';

interface UpdatePromptProps {
  visible: boolean;
}

export const UpdatePrompt = ({ visible }: UpdatePromptProps) => {
  const [status, setStatus] = useState<'ready' | 'updating' | 'error'>('ready');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const updating = status === 'updating';

  const update = async () => {
    if (updating) return;
    setStatus('updating');
    try {
      await updateServiceWorker(true);
    } catch {
      setStatus('error');
    }
  };

  if (!needRefresh || !visible) return null;

  return (
    <aside className="update-prompt" aria-live="polite" role="status">
      <span>
        {status === 'error'
          ? "Update couldn't start. Try again."
          : updating
            ? 'Applying update…'
            : 'Update ready'}
      </span>
      <GameButton
        aria-busy={updating}
        disabled={updating}
        onClick={() => void update()}
      >
        {updating ? 'Updating…' : 'Update now'}
      </GameButton>
    </aside>
  );
};
