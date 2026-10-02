import { XIcon } from './icons';
import { SoundButton } from './SoundButton';

interface DialogCloseButtonProps {
  autoFocus?: boolean;
  label: string;
  onClick: () => void;
}

export const DialogCloseButton = ({
  autoFocus,
  label,
  onClick,
}: DialogCloseButtonProps) => (
  <SoundButton
    aria-label={label}
    autoFocus={autoFocus}
    className="dialog-close"
    onClick={onClick}
  >
    <XIcon aria-hidden="true" weight="bold" />
  </SoundButton>
);
