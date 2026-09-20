import { loadPokemonCatalog } from './lib/pokemon-catalog-client';
import { reportSaveIssue, getSaveIssue } from './lib/storage/save-health';
import './app/styles.css';
import { selectedAccount, startAccountSync } from './features/account/account';
import { trackPageViewed } from './lib/analytics';
import {
  initializePlayerStorage,
  subscribeToPlayerRestore,
} from './lib/storage/player-storage';
import { initializeLocalRound } from './lib/storage/round-storage';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

void loadPokemonCatalog().catch(() => {});
trackPageViewed();
const activeAccount = selectedAccount();
subscribeToPlayerRestore(() => {
  if (selectedAccount() === activeAccount) window.location.assign('/');
});

const loading = document.createElement('p');
loading.setAttribute('role', 'status');
loading.textContent = 'Opening your saved progress…';
root.replaceChildren(loading);
const storage = initializePlayerStorage(activeAccount)
  .then(initializeLocalRound)
  .then(() => {
    if (!getSaveIssue()) return startAccountSync();
  })
  .catch(reportSaveIssue);
void Promise.all([storage, import('./app/mount-game')])
  .then(([, { mountGame }]) => {
    mountGame(root);
  })
  .catch(() => {
    loading.textContent =
      'Quizmon could not be loaded. Please reload to try again.';
  });
