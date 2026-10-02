import * as styles from '../../styles/classes.css.ts';
import { useLayoutEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GameButton } from '../../components/GameButton';
import { BackButton } from '../../components/BackButton';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { PublicTrainerPassport } from '../trainer/PublicTrainerPassport';
import { fetchPublicTrainer } from './public-trainer-client';

export function PublicTrainerScreen({
  playerId,
  catalog,
  catalogError,
  onBack,
  onRetryCatalog,
  backLabel,
}: {
  playerId: string;
  catalog?: PokemonCatalog;
  catalogError: boolean;
  onBack: () => void;
  onRetryCatalog: () => void;
  backLabel: string;
}) {
  const { owner } = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const trainer = useQuery({
    queryKey: ['social', owner, 'trainer', playerId],
    queryFn: () => fetchPublicTrainer(owner, playerId),
    enabled: Boolean(owner),
  });
  const error = trainer.error
    ? trainer.error instanceof TypeError
      ? 'Could not reach this Trainer. Check your connection and try again.'
      : trainer.error instanceof Error
        ? trainer.error.message
        : 'Could not load this Trainer. Try again.'
    : '';

  useLayoutEffect(() => {
    if (!trainer.data || !catalog) return;
    document
      .getElementById('public-trainer-title')
      ?.focus({ preventScroll: true });
  }, [trainer.data, catalog]);

  if (trainer.data && catalog)
    return (
      <PublicTrainerPassport
        backLabel={backLabel}
        catalog={catalog}
        onBack={onBack}
        trainer={trainer.data}
      />
    );

  return (
    <section
      className="game-panel trainer-passport trainer-passport--public"
      aria-labelledby="public-trainer-title"
    >
      <header
        className={`game-panel__header ${styles.trainerPassportHeader} ${styles.trainerPassportPublicHeader}`}
      >
        <BackButton label={backLabel} onClick={onBack} />
        <h1 className="game-panel__title" id="public-trainer-title">
          Trainer profile
        </h1>
      </header>
      {!owner ? (
        <p role="alert">Sign in to view Trainer profiles.</p>
      ) : catalogError ? (
        <>
          <p role="alert">Pokémon data could not load. Try again.</p>
          <GameButton onClick={onRetryCatalog}>Try again</GameButton>
        </>
      ) : error ? (
        <>
          <p role="alert">{error}</p>
          <GameButton onClick={() => void trainer.refetch()}>
            Try again
          </GameButton>
        </>
      ) : (
        <div
          className={styles.publicTrainerLoading}
          role="status"
          aria-label="Loading Trainer profile"
        >
          <span className="visually-hidden">Loading Trainer profile</span>
          <div className={styles.trainerPassportViews} aria-hidden="true">
            {[0, 1, 2, 3].map((slot) => (
              <span className={styles.trainerPassportView} key={slot}>
                <span className={styles.socialSkeleton} />
              </span>
            ))}
          </div>
          <div className={styles.trainerArtifactFrame} aria-hidden="true">
            <span className={styles.socialSkeleton} />
            <span className={styles.socialSkeleton} />
          </div>
        </div>
      )}
    </section>
  );
}
