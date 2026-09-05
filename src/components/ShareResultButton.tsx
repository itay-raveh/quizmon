import { lazy, Suspense, useState, type ReactNode } from 'react';
import { shareResult } from '@/game/share';
import type { GameMode, GameResult } from '@/game/types';
import { GameButton } from './GameButton';

const ShareDialog = lazy(() =>
  import('./ShareDialog').then((module) => ({ default: module.ShareDialog })),
);

interface ShareResultButtonProps {
  children?: ReactNode;
  className?: string;
  mode: GameMode;
  result: GameResult;
  tone?: 'primary' | 'quiet';
}

export const ShareResultButton = ({
  children = 'Share result',
  className,
  mode,
  result,
  tone = 'primary',
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
      <GameButton
        className={`share-result-button ${className ?? ''}`.trim()}
        onClick={() => void share()}
        tone={tone}
      >
        <svg
          className="share-result-button__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
        >
          <path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" />
        </svg>
        {children}
      </GameButton>
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
