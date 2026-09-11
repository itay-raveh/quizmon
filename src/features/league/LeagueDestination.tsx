import { useReducedMotion } from '@/app/providers/motion-context';
import { GameButton } from '@/components/GameButton';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadSimpleIcon,
  ShareNetworkIcon,
} from '@/components/icons';
import { Toast } from '@/components/Toast';
import type { LeagueVictoryRecord } from '@/domain/player/hall-of-fame';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { LEAGUE_QUESTION_COUNT, type LeagueView } from '@/domain/quiz/league';
import '@/features/league/league.css';
import { HallOfFameRecord } from '@/features/trainer/HallOfFameRecord';
import {
  downloadTrainerArtifact,
  renderTrainerArtifactImage,
  shareTrainerArtifact,
  supportsTrainerArtifactSharing,
} from '@/features/trainer/trainer-artifact-export';
import { readPlayerData } from '@/lib/storage/player-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LeagueProgress } from './LeagueProgress';
import { LeagueTrophy } from './LeagueTrophy';

interface LeagueDestinationProps {
  catalog: PokemonCatalog;
  completed: boolean;
  celebrate?: boolean;
  freshRecord?: LeagueVictoryRecord;
  onBack: () => void;
  onStart: () => void;
  onViewChange: (view: LeagueView) => void;
  onViewResults?: () => void;
  view: LeagueView;
  resultSaved?: boolean;
}

export const LeagueDestination = ({
  catalog,
  completed,
  celebrate = false,
  freshRecord,
  onBack,
  onStart,
  onViewChange,
  onViewResults,
  view: requestedView,
  resultSaved = true,
}: LeagueDestinationProps) => {
  const view = completed ? requestedView : 'challenge';
  const heading = useRef<HTMLDivElement>(null);
  const artifact = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [records] = useState(() => {
    const saved = readPlayerData().hallOfFame;
    return freshRecord && !saved.some(({ id }) => id === freshRecord.id)
      ? [...saved, freshRecord]
      : saved;
  });
  const [index, setIndex] = useState(records.length - 1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const dismissNotice = useCallback(() => setNotice(''), []);
  const record = records[index];
  const canShare = supportsTrainerArtifactSharing();

  useEffect(() => {
    heading.current
      ?.querySelector<HTMLElement>('h1')
      ?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [view]);

  const exportRecord = async () => {
    if (!artifact.current || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const image = await renderTrainerArtifactImage(artifact.current);
      if (canShare) {
        const outcome = await shareTrainerArtifact(image, 'hall');
        if (outcome === 'cancelled') return;
        if (outcome === 'shared') {
          setNotice('Victory shared.');
          return;
        }
      }
      downloadTrainerArtifact(image, 'hall');
      setNotice('Victory image downloaded.');
    } catch {
      setError('The victory image could not be shared. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={`league-hall${celebrate && !reducedMotion ? ' league-hall--induction' : ''}`}
      aria-label="Quizmon League"
    >
      <header className="league-hall__header">
        <GameButton aria-label="Back to home" onClick={onBack} tone="quiet">
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        {completed && (
          <nav className="league-hall__navigation" aria-label="League views">
            <GameButton
              tone="quiet"
              aria-pressed={view === 'challenge'}
              onClick={() => onViewChange('challenge')}
            >
              Challenge
            </GameButton>
            <GameButton
              tone="quiet"
              aria-pressed={view === 'hall'}
              onClick={() => onViewChange('hall')}
            >
              Hall of Fame
            </GameButton>
          </nav>
        )}
      </header>
      <div ref={heading}>
        {view === 'challenge' ? (
          <div className="league-challenge">
            <h1 tabIndex={-1}>League challenge</h1>
            <p>{`Answer all ${LEAGUE_QUESTION_COUNT} questions correctly to enter the Hall of Fame.`}</p>
            <LeagueProgress />
            <GameButton className="league-gold-button" onClick={onStart}>
              {completed ? 'League rematch' : 'Start League challenge'}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </GameButton>
          </div>
        ) : record ? (
          <>
            {records.length > 1 && (
              <div
                className="league-hall__history"
                aria-label="Victory history"
              >
                <GameButton
                  tone="quiet"
                  aria-label="Older victory"
                  disabled={index === 0 || busy}
                  onClick={() => setIndex(index - 1)}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </GameButton>
                <span aria-live="polite">
                  Victory {index + 1} of {records.length}
                </span>
                <GameButton
                  tone="quiet"
                  aria-label="Newer victory"
                  disabled={index === records.length - 1 || busy}
                  onClick={() => setIndex(index + 1)}
                >
                  <ArrowRightIcon aria-hidden="true" />
                </GameButton>
              </div>
            )}
            <HallOfFameRecord
              key={record.id}
              catalog={catalog}
              record={record}
              number={index + 1}
              artifactRef={artifact}
            />
            {!resultSaved && record.id === freshRecord?.id && (
              <p className="league-hall__notice" role="alert">
                This victory could not be saved on this device. Download its
                image now to keep it.
              </p>
            )}
            <footer className="league-hall__actions">
              <GameButton
                className="league-gold-button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => void exportRecord()}
              >
                {canShare ? (
                  <ShareNetworkIcon aria-hidden="true" weight="bold" />
                ) : (
                  <DownloadSimpleIcon aria-hidden="true" weight="bold" />
                )}
                {busy
                  ? 'Preparing image…'
                  : canShare
                    ? 'Share victory'
                    : 'Download PNG'}
              </GameButton>
              {onViewResults && record.id === freshRecord?.id && (
                <GameButton tone="quiet" onClick={onViewResults}>
                  View results
                </GameButton>
              )}
            </footer>
          </>
        ) : (
          <div className="league-hall__empty">
            <h1 tabIndex={-1}>Hall of Fame</h1>
            <LeagueTrophy />
            <h2>Your Champion title is yours.</h2>
            <p>
              Your earlier victory’s lineup wasn’t recorded. Win a rematch to
              add your first shareable record.
            </p>
            <GameButton
              className="league-gold-button"
              onClick={() => onViewChange('challenge')}
            >
              Go to challenge{' '}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </GameButton>
          </div>
        )}
      </div>
      {error && (
        <p className="league-hall__notice" role="alert">
          {error}
        </p>
      )}
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
    </section>
  );
};
