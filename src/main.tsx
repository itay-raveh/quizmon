import './app/styles.css';
import { mountGame } from './app/mount-game';
import { discardOldBrowserData } from './lib/storage/reset-browser';
import { captureUnexpectedError, initSentry } from './lib/sentry';

initSentry();

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

const showGame = mountGame(root);
void discardOldBrowserData()
  .then(() => import('./app/initialize-game'))
  .then(({ initializeGame }) => initializeGame())
  .then(showGame)
  .catch((error) => {
    captureUnexpectedError('app.initialization', error);
    const status = root.querySelector<HTMLElement>('.daily-action__detail');
    if (status)
      status.textContent =
        'Quizmon could not be loaded. Please reload to try again.';
  });
