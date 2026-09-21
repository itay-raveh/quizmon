import { useState } from 'react';
import { GameButton } from '../../components/GameButton';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CardholderIcon,
  CertificateIcon,
  MedalIcon,
} from '../../components/icons';
import { SoundButton } from '../../components/SoundButton';
import {
  getCardFinish,
  getTrainerBadges,
  getTrainerRank,
  getTrainerTitles,
  type TrainerBadgeId,
  type TrainerTitle,
  type TrainerView,
} from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import type { PublicTrainer } from '../friends/public-trainer-client';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerCard } from './TrainerCard';
import { TrainerPokedex } from './TrainerPokedex';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';

const views = [
  ['front', 'Card', CardholderIcon],
  ['badges', 'Badges', MedalIcon],
  ['titles', 'Titles', CertificateIcon],
  ['pokedex', 'Pokédex', BookOpenIcon],
] as const;

export function PublicTrainerPassport({
  backLabel,
  catalog,
  onBack,
  trainer,
}: {
  backLabel: string;
  catalog: PokemonCatalog;
  onBack: () => void;
  trainer: PublicTrainer;
}) {
  const [view, setView] = useState<TrainerView>('front');
  const [selectedBadgeId, setSelectedBadgeId] = useState<TrainerBadgeId | null>(
    null,
  );
  const [selectedTitle, setSelectedTitle] = useState<TrainerTitle | null>(null);
  const { profile, stats, record } = trainer;
  const name = profile.name || trainer.player.name || 'Trainer';
  const rank = getTrainerRank(stats);
  const partner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;
  const equippedTitle = getTrainerTitles(stats, profile.specialty).find(
    (title) => title.equipped && title.earned,
  );
  const badges = getTrainerBadges(stats, catalog);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId);

  return (
    <section
      className={`trainer-passport trainer-passport--public trainer-passport--${getCardFinish(rank).toLowerCase()}`}
      aria-labelledby="public-trainer-title"
    >
      <header className="trainer-passport__header trainer-passport__public-header">
        <GameButton
          aria-label={backLabel}
          className="trainer-passport__back"
          tone="quiet"
          onClick={onBack}
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
          <span className="trainer-passport__back-label">{backLabel}</span>
        </GameButton>
        <div className="trainer-passport__public-heading">
          <h1 id="public-trainer-title" tabIndex={-1}>
            {name}
          </h1>
          <p>Trainer profile · View only</p>
        </div>
      </header>

      <nav
        aria-label={`${name}'s Trainer profile`}
        className="trainer-passport__views"
      >
        {views.map(([nextView, label, Icon]) => (
          <SoundButton
            aria-pressed={view === nextView}
            className="trainer-passport__view"
            key={nextView}
            onClick={() => {
              setSelectedBadgeId(null);
              setSelectedTitle(null);
              setView(nextView);
            }}
          >
            <Icon aria-hidden="true" weight="bold" />
            {label}
          </SoundButton>
        ))}
      </nav>

      <div className="trainer-passport__artifact">
        {view === 'pokedex' ? (
          <TrainerPokedex catalog={catalog} foundPokemon={trainer.pokedex} />
        ) : view === 'badges' ? (
          <TrainerBadgeCase
            badges={badges}
            onSelect={(badge) => setSelectedBadgeId(badge.id)}
          />
        ) : view === 'titles' ? (
          <TrainerTitles
            equipped={equippedTitle?.specialty ?? null}
            onSelect={setSelectedTitle}
            stats={stats}
          />
        ) : (
          <TrainerCard
            emptyPartnerLabel="No partner Pokémon"
            partnerDexNumber={partner?.speciesId ?? null}
            partnerHeight={partner?.height}
            partnerSprite={partner?.sprite ?? null}
            partnerSpriteMeasurements={partner?.spriteMeasurements}
            profile={{
              ...profile,
              name,
              specialty: equippedTitle?.specialty ?? null,
            }}
            rank={rank}
            record={record}
            titleTier={equippedTitle?.tier ?? 0}
          />
        )}
      </div>

      {selectedBadge ? (
        <TrainerBadgeDialog
          badge={selectedBadge}
          onClose={() => setSelectedBadgeId(null)}
        />
      ) : null}
      {selectedTitle ? (
        <TrainerTitleDialog
          title={selectedTitle}
          onClose={() => setSelectedTitle(null)}
        />
      ) : null}
    </section>
  );
}
