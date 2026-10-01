import * as styles from './styles/classes.css.ts';
import { useState } from 'react';
import { BackButton } from '../../components/BackButton';
import { PlayerName } from '../../components/PlayerName';
import {
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
  type TrainerSpecialty,
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
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<TrainerSpecialty | null>(null);
  const { profile, stats, record } = trainer;
  const name = profile.name || trainer.player.name || 'Trainer';
  const rank = getTrainerRank(stats);
  const partner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;
  const titles = getTrainerTitles(stats, profile.specialty);
  const equippedTitle = titles.find((title) => title.equipped && title.earned);
  const selectedTitle = titles.find(
    (title) => title.specialty === selectedSpecialty,
  );
  const badges = getTrainerBadges(stats, catalog);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId);

  return (
    <section
      className={`game-panel trainer-passport ${{ Classic: '', Bronze: styles.trainerPassportBronze, Silver: styles.trainerPassportSilver, Gold: styles.trainerPassportGold }[getCardFinish(rank)]}`.trim()}
      aria-labelledby="public-trainer-title"
    >
      <header
        className={`game-panel__header ${styles.trainerPassportHeader} ${styles.trainerPassportPublicHeader}`}
      >
        <BackButton label={backLabel} onClick={onBack} />
        <div className={styles.trainerPassportPublicHeading}>
          <h1
            className="game-panel__title"
            id="public-trainer-title"
            tabIndex={-1}
          >
            <PlayerName trainer={trainer} />
          </h1>
          <p>Trainer profile · View only</p>
        </div>
      </header>

      <nav
        aria-label={`${name}'s Trainer profile`}
        className={styles.trainerPassportViews}
      >
        {views.map(([nextView, label, Icon]) => (
          <SoundButton
            aria-pressed={view === nextView}
            className={styles.trainerPassportView}
            key={nextView}
            onClick={() => {
              setSelectedBadgeId(null);
              setSelectedSpecialty(null);
              setView(nextView);
            }}
          >
            <Icon aria-hidden="true" weight="bold" />
            {label}
          </SoundButton>
        ))}
      </nav>

      <div className={styles.trainerPassportArtifact}>
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
            onSelect={(title) => setSelectedSpecialty(title.specialty)}
            stats={stats}
          />
        ) : (
          <TrainerCard
            emptyPartnerLabel="No partner Pokémon"
            partnerDexNumber={partner?.speciesId ?? null}
            partnerHeight={partner?.height}
            partnerSprite={partner?.sprite ?? null}
            partnerSpriteMeasurements={partner?.spriteMeasurements}
            trainer={{
              profile: {
                ...profile,
                name,
                specialty: equippedTitle?.specialty ?? null,
              },
              stats,
            }}
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
          onClose={() => setSelectedSpecialty(null)}
        />
      ) : null}
    </section>
  );
}
