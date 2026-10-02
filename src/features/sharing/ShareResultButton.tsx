import { GameButton } from '@/components/GameButton';
import { ShareNetworkIcon } from '@/components/icons';
import type { GameMode, GameResult } from '@/domain/quiz/types';
import { shareResult } from '@/features/sharing/result-sharing';
import { lazy, Suspense, useState, type ComponentProps } from 'react';

const ShareDialog = lazy(() =>
  import('./ShareDialog').then((module) => ({ default: module.ShareDialog })),
);

interface ShareResultButtonProps extends Pick<
  ComponentProps<typeof GameButton>,
  'children' | 'className' | 'tone' | 'aria-label'
> {
  mode: GameMode;
  result: GameResult;
}

export const ShareResultButton = ({
  'aria-label': ariaLabel,
  children = 'Share result',
  className,
  mode,
  result,
  tone,
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
        aria-label={ariaLabel}
        className={`share-result-button ${className ?? ''}`.trim()}
        onClick={() => void share()}
        tone={tone}
      >
        <ShareNetworkIcon
          className="share-result-button__icon"
          aria-hidden="true"
          weight="bold"
        />
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
