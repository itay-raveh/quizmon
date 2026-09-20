import { useEffect, useMemo, useRef, useState, type SubmitEvent } from 'react';
import { GameButton } from '../../components/GameButton';
import { SoundButton } from '../../components/SoundButton';
import {
  BookOpenIcon,
  CardholderIcon,
  CertificateIcon,
  DownloadSimpleIcon,
  MedalIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
} from '../../components/icons';
import {
  getDailyStreak,
  type TrainerStats,
} from '../../domain/player/progress';
import { TRAINER_NAME_MAX_LENGTH } from '../../domain/player/trainer-profile';
import {
  getCardFinish,
  getTrainerBadges,
  getTrainerRank,
  getTrainerTitles,
  trainerSpecialtyDetails,
  trainerViewLabels,
  type TrainerBadgeId,
  type TrainerSpecialty,
  type TrainerTitle,
  type TrainerView,
} from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getUtcDate } from '../../domain/quiz/daily';
import { requestPersistentStorage } from '../../lib/storage/persistent-storage';
import { readPlayerData } from '../../lib/storage/player-storage';
import { type TrainerProfile } from '../../lib/storage/trainer-profile-storage';
import { useUpdateState } from '../installation/update-session';
import { PokemonPicker } from './PokemonPicker';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerCard } from './TrainerCard';
import { TrainerPokedex } from './TrainerPokedex';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';
import {
  exportTrainerArtifact as exportArtifactImage,
  supportsTrainerArtifactSharing,
} from './trainer-artifact-export';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onProfileChange: (profile: TrainerProfile) => Promise<void>;
  onViewChange: (view: TrainerView) => void;
  profile: TrainerProfile;
  requestedView: TrainerView;
  stats: TrainerStats;
}

interface ShareNotice {
  message: string;
  visible: boolean;
}

const trainerViews = [
  ['front', 'Card', CardholderIcon],
  ['badges', 'Badges', MedalIcon],
  ['titles', 'Titles', CertificateIcon],
  ['pokedex', 'Pokédex', BookOpenIcon],
] as const;

const shareLabels = {
  badges: 'case',
  front: 'card',
  titles: 'titles',
} satisfies Record<Exclude<TrainerView, 'pokedex'>, string>;

export const TrainerPassport = ({
  catalog,
  onProfileChange,
  onViewChange,
  profile,
  requestedView: view,
  stats,
}: TrainerPassportProps) => {
  const [record] = useState(() => {
    const data = readPlayerData();
    const found = new Set(data.pokedex);
    const pokemon = Object.keys(catalog.pokemon);
    return {
      dayCombo: getDailyStreak(data.results.streak.creditedDates, getUtcDate()),
      pokedexFound: pokemon.filter((name) => found.has(name)).length,
      pokedexTotal: pokemon.length,
    };
  });
  const [revealing, setRevealing] = useState(
    !profile.hasBeenRevealed && view === 'front',
  );
  const [editing, setEditing] = useUpdateState('trainer-editing', false);
  const [name, setName] = useUpdateState('trainer-name', profile.name);
  const [partner, setPartner] = useUpdateState(
    'trainer-partner',
    profile.partnerPokemon,
  );
  const equippedTitle = useMemo(
    () =>
      getTrainerTitles(stats, profile.specialty).find(
        (title) => title.equipped && title.earned,
      ),
    [stats, profile.specialty],
  );
  const savedSpecialty = equippedTitle?.specialty ?? null;
  const [preparingArtifact, setPreparingArtifact] = useState(false);
  const [shareNotice, setShareNotice] = useState<ShareNotice | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<TrainerBadgeId | null>(
    null,
  );
  const [selectedTitle, setSelectedTitle] = useState<TrainerTitle | null>(null);
  const artifactRef = useRef<HTMLElement>(null);
  const pokemonOptions = useMemo(
    () =>
      Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
        name,
        sprite: pokemon.sprite,
      })),
    [catalog.pokemon],
  );
  const savedPartner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;
  const visibleProfile = { ...profile, specialty: savedSpecialty };
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank).toLowerCase();
  const canShareArtifact = supportsTrainerArtifactSharing();
  const badges = getTrainerBadges(stats, catalog);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId) ?? null;

  useEffect(() => {
    if (!profile.hasBeenRevealed) {
      void onProfileChange({ ...profile, hasBeenRevealed: true });
    }
  }, [onProfileChange, profile]);

  useEffect(() => {
    if (!revealing) return;
    const timeoutId = window.setTimeout(() => setRevealing(false), 560);
    return () => window.clearTimeout(timeoutId);
  }, [revealing]);

  const selectView = (nextView: TrainerView) => {
    setSelectedBadgeId(null);
    setSelectedTitle(null);
    setEditing(false);
    onViewChange(nextView);
  };

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onProfileChange({
      ...profile,
      name,
      partnerPokemon: partner,
    });
    setEditing(false);
    void requestPersistentStorage().catch(() => false);
  };

  const toggleEditor = () => {
    if (editing) {
      setEditing(false);
      return;
    }

    setName(profile.name);
    setPartner(profile.partnerPokemon);
    setEditing(true);
  };

  const setTitle = async (specialty: TrainerSpecialty | null) => {
    await onProfileChange({ ...profile, specialty });
    setShareNotice({
      message: specialty
        ? `${trainerSpecialtyDetails[specialty].label} equipped.`
        : 'Trainer title unequipped.',
      visible: true,
    });
    void requestPersistentStorage().catch(() => false);
  };

  const exportArtifact = async () => {
    const artifact = artifactRef.current;
    if (!artifact || preparingArtifact || view === 'pokedex') return;

    setPreparingArtifact(true);
    setShareNotice(null);
    try {
      const outcome = await exportArtifactImage(artifact, view, {
        attemptShare: canShareArtifact,
        onShareError: 'download',
      });
      if (outcome === 'unsupported-downloaded') {
        setShareNotice({
          message: 'PNG downloaded. Share it from your photos.',
          visible: true,
        });
      } else if (outcome === 'share-failed-downloaded') {
        setShareNotice({
          message: 'Sharing was unavailable, so the PNG was downloaded.',
          visible: true,
        });
      } else if (outcome === 'shared') {
        setShareNotice({
          message: `${trainerViewLabels[view]} shared.`,
          visible: false,
        });
      }
    } catch {
      setShareNotice({
        message: 'Image could not be prepared.',
        visible: true,
      });
    } finally {
      setPreparingArtifact(false);
    }
  };

  return (
    <section
      className={`trainer-passport trainer-passport--${finish}`}
      aria-labelledby="trainer-passport-title"
    >
      <header className="trainer-passport__header">
        <h1 id="trainer-passport-title">{trainerViewLabels[view]}</h1>
        {view === 'front' ? (
          <GameButton
            className="trainer-passport__edit"
            tone="quiet"
            onClick={toggleEditor}
          >
            {editing ? null : (
              <PencilSimpleIcon aria-hidden="true" weight="bold" />
            )}
            {editing ? 'Cancel' : 'Edit card'}
          </GameButton>
        ) : null}
      </header>

      {!editing ? (
        <nav aria-label="Trainer profile" className="trainer-passport__views">
          {trainerViews.map(([nextView, label, ViewIcon]) => (
            <SoundButton
              aria-pressed={view === nextView}
              className="trainer-passport__view"
              key={nextView}
              onClick={() => selectView(nextView)}
            >
              <ViewIcon aria-hidden="true" weight="bold" />
              {label}
            </SoundButton>
          ))}
        </nav>
      ) : null}

      {editing ? (
        <form
          className="trainer-customizer"
          onSubmit={(event) => {
            void save(event);
          }}
        >
          <div className="trainer-customizer__name">
            <label htmlFor="trainer-name">Trainer name</label>
            <input
              autoComplete="nickname"
              id="trainer-name"
              maxLength={TRAINER_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional"
              type="text"
              value={name}
            />
          </div>
          <PokemonPicker
            onChange={setPartner}
            options={pokemonOptions}
            value={partner}
          />
          <GameButton type="submit">Save card</GameButton>
        </form>
      ) : null}

      <div
        className={`trainer-passport__artifact ${view === 'front' && revealing ? 'trainer-passport__artifact--reveal' : ''}`.trim()}
      >
        {view === 'pokedex' ? (
          <TrainerPokedex catalog={catalog} />
        ) : view === 'badges' ? (
          <TrainerBadgeCase
            badges={badges}
            caseRef={artifactRef}
            onSelect={(badge) => setSelectedBadgeId(badge.id)}
          />
        ) : view === 'titles' ? (
          <TrainerTitles
            collectionRef={artifactRef}
            equipped={savedSpecialty}
            onSelect={setSelectedTitle}
            stats={stats}
          />
        ) : (
          <TrainerCard
            cardRef={artifactRef}
            partnerDexNumber={savedPartner?.speciesId ?? null}
            partnerSprite={savedPartner?.sprite ?? null}
            profile={visibleProfile}
            record={record}
            rank={rank}
            titleTier={equippedTitle?.tier ?? 0}
          />
        )}
      </div>

      {view !== 'pokedex' && (
        <div className="trainer-passport__controls">
          <GameButton
            aria-busy={preparingArtifact}
            disabled={preparingArtifact}
            onClick={() => void exportArtifact()}
          >
            {canShareArtifact ? (
              <ShareNetworkIcon aria-hidden="true" weight="bold" />
            ) : (
              <DownloadSimpleIcon aria-hidden="true" weight="bold" />
            )}
            {preparingArtifact
              ? 'Preparing PNG…'
              : canShareArtifact
                ? `Share ${shareLabels[view]}`
                : 'Download PNG'}
          </GameButton>
        </div>
      )}
      {selectedBadge ? (
        <TrainerBadgeDialog
          badge={selectedBadge}
          onClose={() => setSelectedBadgeId(null)}
        />
      ) : null}
      {selectedTitle ? (
        <TrainerTitleDialog
          onClose={() => setSelectedTitle(null)}
          onEquip={(title) => setTitle(title.specialty)}
          onUnequip={() => setTitle(null)}
          title={selectedTitle}
        />
      ) : null}
      <p
        className={
          shareNotice?.visible ? 'trainer-passport__status' : 'visually-hidden'
        }
        aria-live="polite"
      >
        {shareNotice?.message}
      </p>
    </section>
  );
};
