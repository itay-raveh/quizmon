import { XIcon } from './icons';

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
  <button
    aria-label={label}
    autoFocus={autoFocus}
    className="dialog-close"
    onClick={onClick}
    type="button"
  >
    <XIcon aria-hidden="true" weight="bold" />
  </button>
);
