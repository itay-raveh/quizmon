import './app/styles.css';
import { trackPageViewed } from '@/lib/analytics';
import { SaveRecoveryBoundary } from '@/features/settings/SaveRecovery';
import { subscribeToPlayerRestore } from '@/lib/storage/player-storage';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

trackPageViewed();
subscribeToPlayerRestore(() => {
  window.location.assign('/');
});

createRoot(root).render(
  <StrictMode>
    <SaveRecoveryBoundary>
      <App />
    </SaveRecoveryBoundary>
  </StrictMode>,
);
