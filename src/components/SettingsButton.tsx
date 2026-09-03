import { GameButton } from './GameButton';

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
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
    </svg>
  </GameButton>
);
