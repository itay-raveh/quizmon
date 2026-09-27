import { useLayoutEffect, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GameButton } from '../../components/GameButton';
import { ArrowLeftIcon } from '../../components/icons';
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
      <header className="game-panel__header trainer-passport__header trainer-passport__public-header">
        <GameButton
          aria-label={backLabel}
          className="trainer-passport__back"
          onClick={onBack}
          tone="quiet"
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
          <span className="trainer-passport__back-label">{backLabel}</span>
        </GameButton>
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
          className="public-trainer-loading"
          role="status"
          aria-label="Loading Trainer profile"
        >
          <span className="visually-hidden">Loading Trainer profile</span>
          <div className="trainer-passport__views" aria-hidden="true">
            {[0, 1, 2, 3].map((slot) => (
              <span className="trainer-passport__view" key={slot}>
                <span className="social-skeleton" />
              </span>
            ))}
          </div>
          <div className="trainer-artifact-frame" aria-hidden="true">
            <span className="social-skeleton" />
            <span className="social-skeleton" />
          </div>
        </div>
      )}
    </section>
  );
}
