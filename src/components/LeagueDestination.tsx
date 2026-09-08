import { useCallback, useEffect, useRef, useState } from 'react';
import { leagueStages, type LeagueView } from '@/game/league';
import type { LeagueVictoryRecord } from '@/game/hall-of-fame';
import { readPlayerData } from '@/game/player-storage';
import type { PokemonCatalog } from '@/game/types';
import {
  downloadTrainerArtifact,
  renderTrainerArtifactImage,
  shareTrainerArtifact,
  supportsTrainerArtifactSharing,
} from '@/game/trainer-card-image';
import { GameButton } from './GameButton';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadSimpleIcon,
  ShareNetworkIcon,
} from './icons';
import { HallOfFameRecord } from './HallOfFameRecord';
import { LeagueTrophy } from './LeagueTrophy';
import { Toast } from './Toast';
import { useReducedMotion } from './motion';
import '@/styles/league.css';

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
  view,
  resultSaved = true,
}: LeagueDestinationProps) => {
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
      </header>
      <div ref={heading}>
        {view === 'challenge' ? (
          <div className="league-challenge">
            <h1 tabIndex={-1}>League challenge</h1>
            <p>Answer all 15 questions correctly to enter the Hall of Fame.</p>
            <ol
              className="league-challenge__trials"
              aria-label="Five League trials"
            >
              {leagueStages.map((stage) => (
                <li key={stage.id}>{stage.marker}</li>
              ))}
            </ol>
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
            <LeagueTrophy locked={!completed} />
            <h2>
              {completed
                ? 'Your Champion title is yours.'
                : 'Your place awaits.'}
            </h2>
            <p>
              {completed
                ? 'Your earlier victory’s lineup wasn’t recorded. Win a rematch to add your first shareable record.'
                : 'Clear the League to record your victory and its Pokémon here.'}
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
