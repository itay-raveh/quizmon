import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameButton } from './GameButton';

interface UpdatePromptProps {
  visible: boolean;
}

export const UpdatePrompt = ({ visible }: UpdatePromptProps) => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh || !visible) return null;

  return (
    <aside className="update-prompt" aria-live="polite" role="status">
      <span>Update ready</span>
      <GameButton onClick={() => void updateServiceWorker(true)}>
        Update now
      </GameButton>
    </aside>
  );
};
