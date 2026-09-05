import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { trackPageViewed } from './game/analytics';
import './fonts.css';
import './styles/foundation.css';
import './styles/landing.css';
import './styles/game.css';
import './styles/overlays.css';
import './styles/settings.css';
import './styles/trainer.css';
import './styles/adaptive.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

trackPageViewed();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
