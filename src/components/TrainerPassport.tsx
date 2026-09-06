import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PokemonCatalog } from '@/game/types';
import type { TrainerStats } from '@/game/storage';
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
  isLeagueUnlocked,
  trainerSpecialtyLabels,
  type TrainerBadgeId,
  type TrainerSpecialty,
  type TrainerTitle,
  type TrainerView,
} from '@/game/trainer';
import { GameButton } from './GameButton';
import {
  ArrowLeftIcon,
  CardholderIcon,
  CertificateIcon,
  DownloadSimpleIcon,
  MedalIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
} from './icons';
import { LeagueGateway } from './LeagueGateway';
import { PokemonPicker } from './PokemonPicker';
import { SoundButton } from './SoundButton';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerCard } from './TrainerCard';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onBack: () => void;
  onProfileChange: (profile: TrainerProfile) => void;
  onStartLeague: () => void;
  onViewChange: (view: TrainerView) => void;
  profile: TrainerProfile;
  requestedView: TrainerView;
  stats: TrainerStats;
}

interface ShareNotice {
  message: string;
  visible: boolean;
}

const viewLabels = {
  badges: 'League Badge Case',
  front: 'Trainer Card',
  titles: 'Trainer Titles',
} satisfies Record<TrainerView, string>;

const shareLabels = {
  badges: 'case',
  front: 'card',
  titles: 'titles',
} satisfies Record<TrainerView, string>;

export const TrainerPassport = ({
  catalog,
  onBack,
  onProfileChange,
  onStartLeague,
  onViewChange,
  profile,
  requestedView,
  stats,
}: TrainerPassportProps) => {
  const view = requestedView;
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
  const finish = getCardFinish(getTrainerRank(stats)).toLowerCase();
  const canShareArtifact = supportsTrainerArtifactSharing();
  const badges = getTrainerBadges(stats);
  const leagueUnlocked = isLeagueUnlocked(stats);
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

  const equipTitle = (nextSpecialty: TrainerSpecialty) => {
    onProfileChange({ ...profile, specialty: nextSpecialty });
    setShareNotice({
      message: `${trainerSpecialtyLabels[nextSpecialty]} equipped.`,
      visible: true,
    });
    void requestPersistentStorage().catch(() => false);
  };

  const unequipTitle = () => {
    onProfileChange({ ...profile, specialty: null });
    setShareNotice({
      message: 'Trainer title unequipped.',
      visible: true,
    });
    void requestPersistentStorage().catch(() => false);
  };

  const exportArtifact = async () => {
    const artifact = artifactRef.current;
    if (!artifact || preparingArtifact) return;

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
            message: `${viewLabels[view]} shared.`,
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
          <h1 id="trainer-passport-title">{viewLabels[view]}</h1>
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
              maxLength={20}
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
        {view === 'badges' ? (
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
            stats={stats}
          />
        )}
      </div>

      {view === 'badges' && leagueUnlocked ? (
        <LeagueGateway
          completed={stats.leagueCompleted}
          onStart={onStartLeague}
        />
      ) : null}

      <div className="trainer-passport__controls">
        {canShareArtifact ? (
          <GameButton
            aria-busy={preparingArtifact}
            disabled={preparingArtifact}
            onClick={() => void exportArtifact()}
          >
            <ShareNetworkIcon aria-hidden="true" weight="bold" />
            {preparingArtifact
              ? 'Preparing PNG…'
              : `Share ${shareLabels[view]}`}
          </GameButton>
        ) : (
          <GameButton
            aria-busy={preparingArtifact}
            disabled={preparingArtifact}
            onClick={() => void exportArtifact()}
          >
            <DownloadSimpleIcon aria-hidden="true" weight="bold" />
            {preparingArtifact ? 'Preparing PNG…' : 'Download PNG'}
          </GameButton>
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
          onClose={() => setSelectedTitle(null)}
          onEquip={(title) => equipTitle(title.specialty)}
          onUnequip={unequipTitle}
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
