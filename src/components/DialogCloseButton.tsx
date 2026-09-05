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
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  </button>
);
