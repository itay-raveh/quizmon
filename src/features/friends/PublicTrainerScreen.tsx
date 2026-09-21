import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { GameButton } from '../../components/GameButton';
import { ArrowLeftIcon } from '../../components/icons';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { accountSnapshot, subscribeAccount } from '../account/account';
import { PublicTrainerPassport } from '../trainer/PublicTrainerPassport';
import {
  fetchPublicTrainer,
  type PublicTrainer,
} from './public-trainer-client';

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
  const [loaded, setLoaded] = useState<{
    key: string;
    trainer: PublicTrainer;
  }>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    void fetchPublicTrainer(owner, playerId, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: `${owner}:${playerId}`, trainer: next });
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof TypeError
              ? 'Could not reach this Trainer. Check your connection and try again.'
              : cause instanceof Error
                ? cause.message
                : 'Could not load this Trainer. Try again.',
          );
      });
    return () => controller.abort();
  }, [owner, playerId, retry]);

  useLayoutEffect(() => {
    if (loaded?.key !== `${owner}:${playerId}` || !catalog) return;
    document
      .getElementById('public-trainer-title')
      ?.focus({ preventScroll: true });
  }, [loaded, owner, playerId, catalog]);

  if (loaded?.key === `${owner}:${playerId}` && catalog)
    return (
      <PublicTrainerPassport
        backLabel={backLabel}
        catalog={catalog}
        onBack={onBack}
        trainer={loaded.trainer}
      />
    );

  return (
    <section
      className="trainer-passport trainer-passport--public"
      aria-labelledby="public-trainer-title"
    >
      <header className="trainer-passport__header trainer-passport__public-header">
        <GameButton onClick={onBack} tone="quiet">
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
          {backLabel}
        </GameButton>
        <h1 id="public-trainer-title">Trainer profile</h1>
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
          <GameButton
            onClick={() => {
              setError('');
              setRetry((current) => current + 1);
            }}
          >
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
