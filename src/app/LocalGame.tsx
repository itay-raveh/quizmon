import { useState, useSyncExternalStore } from 'react';
import { GameButton } from '../components/GameButton';
import { downloadBackup } from '../features/settings/backup';
import {
  getSaveError,
  retryPlayerSave,
  subscribeToPlayerChanges,
} from '../lib/storage/player-storage';
import { App } from './App';

export const LocalGame = () => {
  const error = useSyncExternalStore(subscribeToPlayerChanges, getSaveError);
  const [exportError, setExportError] = useState('');
  return (
    <>
      {error && (
        <section className="settings-error" role="alert">
          <h2>Your progress has not been saved</h2>
          <p>{error}</p>
          <p>
            Keep this tab open while you free some storage or allow site
            storage.
          </p>
          <GameButton onClick={() => void retryPlayerSave()}>
            Try saving again
          </GameButton>
          <GameButton
            tone="quiet"
            onClick={() => {
              setExportError('');
              void downloadBackup().catch(() =>
                setExportError(
                  'The saved progress could not be exported. Keep this tab open and try again.',
                ),
              );
            }}
          >
            Download saved progress
          </GameButton>
          {exportError && <p>{exportError}</p>}
        </section>
      )}
      <div inert={Boolean(error)}>
        <App />
      </div>
    </>
  );
};
