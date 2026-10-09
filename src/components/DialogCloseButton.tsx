import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from './icons';
import { SoundButton } from './SoundButton';

interface DialogCloseButtonProps {
  label: string;
}

export const DialogCloseButton = ({ label }: DialogCloseButtonProps) => (
  <Dialog.Close
    render={<SoundButton />}
    aria-label={label}
    className="dialog-close"
  >
    <XIcon aria-hidden="true" weight="bold" />
  </Dialog.Close>
);
