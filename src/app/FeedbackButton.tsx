import { ChatTextIcon } from '@phosphor-icons/react/ssr';
import { useEffect, useRef } from 'react';
import { attachFeedback, feedbackLabel, sentryEnabled } from '../lib/sentry.ts';

export const FeedbackButton = ({ showLabel }: { showLabel?: boolean }) => {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (button.current) return attachFeedback(button.current);
  }, []);

  if (!sentryEnabled) return null;
  return (
    <button
      ref={button}
      className="game-button game-button--quiet feedback-button"
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
