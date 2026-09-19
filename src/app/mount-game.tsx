import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SaveRecoveryBoundary } from '../features/settings/SaveRecovery';
import { getSaveIssue } from '../lib/storage/save-health';
import { LocalGame } from './LocalGame';

export const mountGame = (root: HTMLElement) => {
  createRoot(root).render(
    <StrictMode>
      <SaveRecoveryBoundary>
        {getSaveIssue() ? null : <LocalGame />}
      </SaveRecoveryBoundary>
    </StrictMode>,
  );
};
