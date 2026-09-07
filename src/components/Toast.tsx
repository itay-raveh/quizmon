import { useEffect, useRef, useState } from 'react';
import { CheckIcon, XIcon } from './icons';
import { SoundButton } from './SoundButton';

export const Toast = ({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) => {
  const popup = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const element = popup.current;
    element?.showPopover();
    return () => element?.hidePopover();
  }, []);

  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [onDismiss, hovered, focused]);

  return (
    <div
      className="toast"
      popover="manual"
      ref={popup}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <span className="toast__message" role="status">
        <CheckIcon aria-hidden="true" weight="bold" />
        <span>{message}</span>
      </span>
      <SoundButton
        aria-label="Dismiss notification"
        className="toast__dismiss"
        onClick={onDismiss}
      >
        <XIcon aria-hidden="true" weight="bold" />
      </SoundButton>
    </div>
  );
};
