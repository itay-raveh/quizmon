import { GameButton } from '@/components/GameButton';
import { GearSixIcon } from '@/components/icons';

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
    <GearSixIcon aria-hidden="true" weight="bold" />
  </GameButton>
);
