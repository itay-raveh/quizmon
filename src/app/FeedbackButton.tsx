import { Button } from '@base-ui/react/button';
import { ChatTextIcon } from '@phosphor-icons/react/ssr';
import { useEffect, useRef } from 'react';
import { attachFeedback, feedbackLabel, sentryEnabled } from '../lib/sentry.ts';

export const FeedbackButton = ({
  showLabel,
  feedbackLifecycle,
}: {
  showLabel?: boolean;
  feedbackLifecycle?: Parameters<typeof attachFeedback>[1];
}) => {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!button.current) return;
    return attachFeedback(button.current, feedbackLifecycle);
  }, [feedbackLifecycle]);

  if (!sentryEnabled) return null;
  return (
    <Button
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
    </Button>
  );
};
