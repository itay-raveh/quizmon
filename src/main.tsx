import './app/styles.css';
import { mountGame } from './app/mount-game';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

const showGame = mountGame(root);
void import('./app/initialize-game')
  .then(({ initializeGame }) => initializeGame())
  .then(showGame)
  .catch(() => {
    const status = root.querySelector<HTMLElement>('.daily-action__detail');
    if (status)
      status.textContent =
        'Quizmon could not be loaded. Please reload to try again.';
  });
