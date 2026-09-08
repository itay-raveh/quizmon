import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PokemonCatalog } from '@/game/types';
import { TRAINER_NAME_MAX_LENGTH } from '@/game/profile-data';
import { getDailyStreak, type TrainerStats } from '@/game/storage';
import { getLocalDate } from '@/game/daily';
import { readPlayerData } from '@/game/player-storage';
import {
  requestPersistentStorage,
  type TrainerProfile,
} from '@/game/trainer-profile';
import {
  downloadTrainerArtifact,
  renderTrainerArtifactImage,
  shareTrainerArtifact,
  supportsTrainerArtifactSharing,
} from '@/game/trainer-card-image';
import {
  getCardFinish,
  getQualifiedTrainerSpecialties,
  getTrainerBadges,
  getTrainerRank,
  trainerSpecialtyLabels,
  trainerViewLabels,
  type TrainerBadgeId,
  type TrainerSpecialty,
  type TrainerTitle,
  type TrainerView,
} from '@/game/trainer';
import { GameButton } from './GameButton';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CardholderIcon,
  CertificateIcon,
  DownloadSimpleIcon,
  MedalIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
} from './icons';
import { PokemonPicker } from './PokemonPicker';
import { SoundButton } from './SoundButton';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerCard } from './TrainerCard';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';
import { TrainerPokedex } from './TrainerPokedex';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onBack: () => void;
  onProfileChange: (profile: TrainerProfile) => void;
  onViewChange: (view: TrainerView) => void;
  profile: TrainerProfile;
  requestedView: TrainerView;
  stats: TrainerStats;
}

interface ShareNotice {
  message: string;
  visible: boolean;
}

const shareLabels = {
  badges: 'case',
  front: 'card',
  titles: 'titles',
} satisfies Record<Exclude<TrainerView, 'pokedex'>, string>;

export const TrainerPassport = ({
  catalog,
  onBack,
  onProfileChange,
  onViewChange,
  profile,
  requestedView,
  stats,
}: TrainerPassportProps) => {
  const view = requestedView;
  const [record] = useState(() => {
    const data = readPlayerData();
    const found = new Set(data.pokedex);
    const pokemon = Object.keys(catalog.pokemon);
    return {
      dayCombo: getDailyStreak(
        data.results.streak.creditedDates,
        getLocalDate(),
      ),
      pokedexFound: pokemon.filter((name) => found.has(name)).length,
      pokedexTotal: pokemon.length,
    };
  });
  const [revealing, setRevealing] = useState(
    !profile.hasBeenRevealed && requestedView === 'front',
  );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [partner, setPartner] = useState(profile.partnerPokemon);
  const qualifiedSpecialties = useMemo(
    () => getQualifiedTrainerSpecialties(stats),
    [stats],
  );
  const savedSpecialty =
    profile.specialty && qualifiedSpecialties.includes(profile.specialty)
      ? profile.specialty
      : null;
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
  const partnerSprite = partner
    ? (catalog.pokemon[partner]?.sprite ?? null)
    : null;
  const savedPartner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;
  const visibleProfile = { ...profile, specialty: savedSpecialty };
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank).toLowerCase();
  const canShareArtifact = supportsTrainerArtifactSharing();
  const badges = getTrainerBadges(stats);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId) ?? null;

  useEffect(() => {
    if (!profile.hasBeenRevealed) {
      onProfileChange({ ...profile, hasBeenRevealed: true });
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

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onProfileChange({
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

  const setTitle = (specialty: TrainerSpecialty | null) => {
    onProfileChange({ ...profile, specialty });
    setShareNotice({
      message: specialty
        ? `${trainerSpecialtyLabels[specialty]} equipped.`
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
      const image = await renderTrainerArtifactImage(artifact);
      if (!canShareArtifact) {
        downloadTrainerArtifact(image, view);
        return;
      }

      try {
        const outcome = await shareTrainerArtifact(image, view);
        if (outcome === 'unsupported') {
          downloadTrainerArtifact(image, view);
          setShareNotice({
            message: 'PNG downloaded. Share it from your photos.',
            visible: true,
          });
        } else if (outcome === 'shared') {
          setShareNotice({
            message: `${trainerViewLabels[view]} shared.`,
            visible: false,
          });
        }
      } catch {
        downloadTrainerArtifact(image, view);
        setShareNotice({
          message: 'Sharing was unavailable, so the PNG was downloaded.',
          visible: true,
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
        <GameButton
          aria-label="Back"
          className="trainer-passport__back"
          title="Back"
          tone="quiet"
          onClick={onBack}
        >
          <ArrowLeftIcon aria-hidden="true" weight="bold" />
        </GameButton>
        <div>
          <h1 id="trainer-passport-title">{trainerViewLabels[view]}</h1>
        </div>
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
        ) : (
          <span aria-hidden="true" className="trainer-passport__header-space" />
        )}
      </header>

      {!editing ? (
        <nav aria-label="Trainer profile" className="trainer-passport__views">
          {(
            [
              ['front', 'Card', CardholderIcon],
              ['badges', 'Badges', MedalIcon],
              ['titles', 'Titles', CertificateIcon],
              ['pokedex', 'Pokédex', BookOpenIcon],
            ] as const
          ).map(([nextView, label, ViewIcon]) => (
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
        <form className="trainer-customizer" onSubmit={save}>
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
          <div className="trainer-customizer__preview" aria-hidden="true">
            {partnerSprite ? (
              <img src={partnerSprite} alt="" width="96" height="96" />
            ) : (
              <span>?</span>
            )}
          </div>
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
            partnerDexNumber={savedPartner?.id ?? null}
            partnerSprite={savedPartner?.sprite ?? null}
            profile={visibleProfile}
            record={record}
            rank={rank}
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
