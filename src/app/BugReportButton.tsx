import { BugIcon } from '@phosphor-icons/react/ssr';
import { useEffect, useRef } from 'react';
import { attachBugReport, sentryEnabled } from '../lib/sentry.ts';

export const BugReportButton = ({ label }: { label?: string }) => {
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
      aria-label={label ? undefined : 'Report a bug'}
      title={label ? undefined : 'Report a bug'}
    >
      {label ?? <BugIcon size={22} weight="bold" aria-hidden="true" />}
    </button>
  );
};
