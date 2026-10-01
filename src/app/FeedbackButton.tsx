import * as styles from './classes.css.ts';
import { ChatTextIcon } from '@phosphor-icons/react/ssr';
import { useEffect, useRef, type RefObject } from 'react';
import { attachFeedback, feedbackLabel, sentryEnabled } from '../lib/sentry.ts';

export const FeedbackButton = ({
  showLabel,
  modalDialog,
}: {
  showLabel?: boolean;
  modalDialog?: RefObject<HTMLDialogElement | null>;
}) => {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!button.current) return;
    const reopen = () => {
      if (modalDialog?.current && !modalDialog.current.open)
        modalDialog.current.showModal();
    };
    return attachFeedback(
      button.current,
      modalDialog
        ? {
            // Sentry mounts its form outside native dialogs, which occupy the top layer.
            onFormOpen: () => modalDialog.current?.close(),
            onFormClose: reopen,
            onFormSubmitted: reopen,
          }
        : undefined,
    );
  }, [modalDialog]);

  if (!sentryEnabled) return null;
  return (
    <button
      ref={button}
      className={`game-button game-button--quiet ${styles.feedbackButton}`}
      type="button"
      aria-label={showLabel ? undefined : feedbackLabel}
      title={showLabel ? undefined : feedbackLabel}
    >
      {showLabel ? (
        feedbackLabel
      ) : (
        <ChatTextIcon size={22} weight="bold" aria-hidden="true" />
      )}
    </button>
  );
};
