import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { InstallGuide } from '@/pwa/install-platform';
import { DialogCloseButton } from './DialogCloseButton';
import { useModalDialog } from './dialog';

const instructions: Record<InstallGuide, readonly string[]> = {
  ios: [
    'Open your browser’s Share menu.',
    'Choose Add to Home Screen. If it is missing, look under Edit Actions.',
    'Leave Open as Web App on if shown, then tap Add.',
    'Open Quizmon from your Home Screen. You can turn on Daily reminders in Settings.',
  ],
  'firefox-android': [
    'Open Firefox’s three-dot menu.',
    'Choose Install or Add app to Home screen, then confirm Add.',
    'Open Quizmon from your Home Screen.',
  ],
  'firefox-windows': [
    'Click the web apps button in Firefox’s address bar.',
    'Pin Quizmon to your taskbar when Windows asks, or open it from the Start menu.',
    'If the button is missing, update Firefox. Microsoft Store installations need Firefox 150 or later.',
  ],
  'safari-mac': [
    'In Safari, choose File, then Add to Dock.',
    'Click Add, then open Quizmon from your Dock.',
    'Add to Dock requires macOS Sonoma or later.',
  ],
};

export const InstallDialog = ({
  guide,
  onClose,
}: {
  guide: InstallGuide;
  onClose: () => void;
}) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const { dialogProps, closeDialog } = useModalDialog(onClose, {
    initialFocus: heading,
    dismissOnBackdrop: true,
  });
  return createPortal(
    <dialog
      {...dialogProps}
      className="share-dialog install-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.stopPropagation();
        dialogProps.onCancel(event);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        dialogProps.onPointerDown?.(event);
      }}
    >
      <header className="share-dialog__header">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          Install Quizmon
        </h2>
        <DialogCloseButton
          label="Close installation instructions"
          onClick={closeDialog}
        />
      </header>
      <div className="share-dialog__body install-dialog__body">
        {guide === 'ios' || guide === 'safari-mac' ? (
          <p>
            Your saved progress does not move into the app automatically. Before
            installing, use Settings → Backup → Download backup. After opening
            the app, use Restore backup in the same place.
          </p>
        ) : null}
        <ol className="install-action__steps">
          {instructions[guide].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </dialog>,
    document.body,
  );
};
