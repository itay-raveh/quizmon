import './app/styles';
import { mountGame } from './app/mount-game';
import { captureUnexpectedError, initSentry } from './lib/sentry';
import { dailyActionDetail } from './styles/classes.css.ts';

initSentry();

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

const showGame = mountGame(root);
void import('./app/initialize-game')
  .then(({ initializeGame }) => initializeGame())
  .then(showGame)
  .catch((error) => {
    captureUnexpectedError('app.initialization', error);
    const status = root.querySelector<HTMLElement>(`.${dailyActionDetail}`);
    if (status)
      status.textContent =
        'Quizmon could not be loaded. Please reload to try again.';
  });
