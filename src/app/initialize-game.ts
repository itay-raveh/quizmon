import { selectedAccount, startAccountSync } from '../features/account/account';
import { trackPageViewed } from '../lib/analytics';
import { loadPokemonCatalog } from '../lib/pokemon-catalog-client';
import { reportSaveIssue, getSaveIssue } from '../lib/storage/save-health';
import {
  initializePlayerStorage,
  subscribeToPlayerRestore,
} from '../lib/storage/player-storage';
import { initializeLocalRound } from '../lib/storage/round-storage';

export const initializeGame = async () => {
  void loadPokemonCatalog().catch(() => {});
  trackPageViewed();
  let activeAccount: string | undefined;
  try {
    activeAccount = selectedAccount();
  } catch (error) {
    reportSaveIssue(error);
    return;
  }
  subscribeToPlayerRestore(() => {
    if (selectedAccount() === activeAccount) window.location.assign('/');
  });
  await initializePlayerStorage(activeAccount)
    .then(initializeLocalRound)
    .catch(reportSaveIssue);
  if (!getSaveIssue()) void startAccountSync().catch(reportSaveIssue);
};
