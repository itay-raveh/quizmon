import { Dialog } from '@base-ui/react/dialog';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof Dialog.Popup> & {
  onClose?: () => void;
  dismissOnBackdrop?: boolean;
  open?: boolean;
};

export const ModalDialog = ({
  children,
  onClose,
  dismissOnBackdrop = false,
  open = true,
  ...props
}: Props) => {
  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={!dismissOnBackdrop}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) return;
        if (onClose) onClose();
        else details.cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup {...props}>{children}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
