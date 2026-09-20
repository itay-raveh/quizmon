import { SoundButton } from '@/components/SoundButton';
import { GearSixIcon } from '@/components/icons';

interface SettingsButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export const SettingsButton = ({ disabled, onClick }: SettingsButtonProps) => (
  <SoundButton className="settings-link" disabled={disabled} onClick={onClick}>
    <GearSixIcon aria-hidden="true" weight="bold" />
    <span>Settings</span>
  </SoundButton>
);
