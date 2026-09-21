import { GameButton } from '@/components/GameButton';
import { GearSixIcon } from '@/components/icons';

interface SettingsButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export const SettingsButton = ({ disabled, onClick }: SettingsButtonProps) => (
  <GameButton
    aria-label="Settings"
    title="Settings"
    className="settings-link"
    disabled={disabled}
    onClick={onClick}
    tone="quiet"
  >
    <GearSixIcon aria-hidden="true" weight="bold" />
  </GameButton>
);
