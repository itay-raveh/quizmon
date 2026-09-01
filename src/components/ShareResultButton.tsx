import { lazy, Suspense, useState, type ReactNode } from 'react';
import { shareResult } from '@/game/share';
import type { GameMode, GameResult } from '@/game/types';
import { GameButton } from './GameButton';

const ShareDialog = lazy(() =>
  import('./ShareDialog').then((module) => ({ default: module.ShareDialog })),
);

interface ShareResultButtonProps {
  children?: ReactNode;
  mode: GameMode;
  result: GameResult;
}

export const ShareResultButton = ({
  children = 'Share result',
  mode,
  result,
}: ShareResultButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState('');

  const share = async () => {
    try {
      const outcome = await shareResult(mode, result);
      if (outcome === 'unsupported') {
        setDialogOpen(true);
        setStatus('Share options opened.');
      } else {
        setStatus(outcome === 'shared' ? 'Result shared.' : '');
      }
    } catch {
      setDialogOpen(true);
      setStatus('Native sharing was unavailable. Share options opened.');
    }
  };

  return (
    <>
      <GameButton onClick={() => void share()}>{children}</GameButton>
      <span className="visually-hidden" aria-live="polite">
        {status}
      </span>
      {dialogOpen ? (
        <Suspense
          fallback={
            <span className="visually-hidden" role="status">
              Opening share options…
            </span>
          }
        >
          <ShareDialog
            mode={mode}
            onClose={() => setDialogOpen(false)}
            result={result}
          />
        </Suspense>
      ) : null}
    </>
  );
};
