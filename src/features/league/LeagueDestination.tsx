import * as styles from './classes.css.ts';
import { GameButton } from '@/components/GameButton';
import { BackButton } from '@/components/BackButton';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import type { LeagueVictoryRecord } from '@/domain/player/hall-of-fame';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { LEAGUE_QUESTION_COUNT, type LeagueView } from '@/domain/quiz/league';
import {
  readPlayerData,
  subscribeToPlayerChanges,
} from '@/lib/storage/player-storage';
import { useEffect, useRef, useState } from 'react';
import { LeagueProgress } from './LeagueProgress';
import { LeagueTrophy } from './LeagueTrophy';
import { HallOfFameRecord } from './HallOfFameRecord';

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
  const [savedRecords, setSavedRecords] = useState(
    () => readPlayerData().hallOfFame,
  );
  const records =
    freshRecord && !savedRecords.some(({ id }) => id === freshRecord.id)
      ? [...savedRecords, freshRecord]
      : savedRecords;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = records.findIndex(({ id }) => id === selectedId);
  const index = selectedIndex < 0 ? records.length - 1 : selectedIndex;
  const record = records[index];

  useEffect(() => {
    const refresh = () => setSavedRecords(readPlayerData().hallOfFame);
    return subscribeToPlayerChanges(refresh);
  }, []);

  useEffect(() => {
    heading.current
      ?.querySelector<HTMLElement>('h1')
      ?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <section
      className={`${styles.leagueHall}${celebrate ? ` ${styles.leagueHallInduction}` : ''}`}
      aria-label="Quizmon League"
    >
      <header className={styles.leagueHallHeader}>
        <BackButton label="Back to home" onClick={onBack} />
        {completed && (
          <nav
            className={styles.leagueHallNavigation}
            aria-label="League views"
          >
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
          <div className={styles.leagueChallenge}>
            <h1 tabIndex={-1}>League challenge</h1>
            <p>{`Answer all ${LEAGUE_QUESTION_COUNT} questions correctly to enter the Hall of Fame.`}</p>
            <LeagueProgress />
            <GameButton className={styles.leagueGoldButton} onClick={onStart}>
              {completed ? 'League rematch' : 'Start League challenge'}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </GameButton>
          </div>
        ) : record ? (
          <>
            {records.length > 1 && (
              <div
                className={styles.leagueHallHistory}
                aria-label="Victory history"
              >
                <GameButton
                  tone="quiet"
                  aria-label="Older victory"
                  disabled={index === 0}
                  onClick={() => setSelectedId(records[index - 1]!.id)}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </GameButton>
                <span aria-live="polite">
                  Victory {index + 1} of {records.length}
                </span>
                <GameButton
                  tone="quiet"
                  aria-label="Newer victory"
                  disabled={index === records.length - 1}
                  onClick={() => setSelectedId(records[index + 1]!.id)}
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
            />
            {!resultSaved && record.id === freshRecord?.id && (
              <p className={styles.leagueHallNotice} role="alert">
                This victory could not be saved on this device.
              </p>
            )}
            {onViewResults && record.id === freshRecord?.id && (
              <footer className={styles.leagueHallActions}>
                <GameButton tone="quiet" onClick={onViewResults}>
                  View results
                </GameButton>
              </footer>
            )}
          </>
        ) : (
          <div className={styles.leagueHallEmpty}>
            <h1 tabIndex={-1}>Hall of Fame</h1>
            <LeagueTrophy />
            <h2>Your Champion title is yours.</h2>
            <p>
              Your earlier victory’s lineup wasn’t recorded. Win a rematch to
              add your first record.
            </p>
            <GameButton
              className={styles.leagueGoldButton}
              onClick={() => onViewChange('challenge')}
            >
              Go to challenge{' '}
              <ArrowRightIcon aria-hidden="true" weight="bold" />
            </GameButton>
          </div>
        )}
      </div>
    </section>
  );
};
