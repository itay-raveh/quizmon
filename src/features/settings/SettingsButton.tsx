import { GameButton } from '@/components/GameButton';
import { SlidersHorizontalIcon } from '@/components/icons';

interface SettingsButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export const SettingsButton = ({ disabled, onClick }: SettingsButtonProps) => (
  <GameButton
    aria-label="Settings"
    className="settings-button"
    disabled={disabled}
    onClick={onClick}
    title="Settings"
    tone="quiet"
  >
    <SlidersHorizontalIcon aria-hidden="true" weight="bold" />
  </GameButton>
);
