import { BugIcon } from '@phosphor-icons/react/ssr';
import { useEffect, useRef } from 'react';
import { attachBugReport, sentryEnabled } from '../lib/sentry.ts';

export const BugReportButton = () => {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (button.current) return attachBugReport(button.current);
  }, []);

  if (!sentryEnabled) return null;
  return (
    <button
      ref={button}
      className="game-button game-button--quiet bug-report-button"
      type="button"
      aria-label="Report a bug"
      title="Report a bug"
    >
      <BugIcon size={22} weight="bold" aria-hidden="true" />
    </button>
  );
};
