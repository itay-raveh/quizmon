import { useEffect, useMemo, useRef, useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { GameButton } from '../../components/GameButton';
import { useInteractionSound } from '../../lib/audio/sound-context';
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
import { trainerAvatarOptions } from '../../domain/player/trainer-avatars';
import { createSearch, normalizeSearch } from '../../domain/pokemon/search';
import {
  getCardFinish,
  getTrainerBadges,
  getTrainerRank,
  getTrainerTitles,
  trainerSpecialtyDetails,
  trainerViewLabels,
  type TrainerBadgeId,
  type TrainerSpecialty,
  type TrainerView,
} from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getUtcDate } from '../../domain/quiz/daily';
import { requestPersistentStorage } from '../../lib/storage/persistent-storage';
import { readPlayerData } from '../../lib/storage/player-storage';
import { type TrainerProfile } from '../../lib/storage/trainer-profile-storage';
import { useUpdateState } from '../../lib/storage/update-reload-state';
import { PokemonPicker } from './PokemonPicker';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerCard } from './TrainerCard';
import { TrainerPokedex } from './TrainerPokedex';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';
import { trainerPath } from './trainer-route';
import {
  exportTrainerArtifact as exportArtifactImage,
  renderTrainerArtifactImage,
  supportsTrainerArtifactSharing,
} from './trainer-artifact-export';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onProfileChange: (profile: TrainerProfile) => Promise<boolean>;
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

const searchAvatars = createSearch(
  trainerAvatarOptions.map((avatar) => ({
    ...avatar,
    label: avatar.name,
    normalized: normalizeSearch(avatar.name),
    aliases: [normalizeSearch(avatar.id)],
  })),
);

export const TrainerPassport = ({
  catalog,
  onProfileChange,
  profile,
  requestedView: view,
  stats,
}: TrainerPassportProps) => {
  const data = readPlayerData();
  const found = new Set(data.pokedex);
  const pokemon = Object.keys(catalog.pokemon);
  const record = {
    dayCombo: getDailyStreak(data.results.streak.creditedDates, getUtcDate()),
    pokedex: data.pokedex,
    pokedexFound: pokemon.filter((name) => found.has(name)).length,
    pokedexTotal: pokemon.length,
  };
  const [revealing, setRevealing] = useState(
    !profile.hasBeenRevealed && view === 'front',
  );
  const location = useLocation();
  const navigate = useNavigate();
  const playSound = useInteractionSound();
  const editing = location.pathname === '/trainer/edit';
  const [name, setName] = useUpdateState('trainer-name', profile.name);
  const [avatar, setAvatar] = useUpdateState('trainer-avatar', profile.avatar);
  const [avatarQuery, setAvatarQuery] = useState('');
  const [partner, setPartner] = useUpdateState(
    'trainer-partner',
    profile.partnerPokemon,
  );
  const titles = useMemo(
    () => getTrainerTitles(stats, profile.specialty),
    [stats, profile.specialty],
  );
  const equippedTitle = titles.find((title) => title.equipped && title.earned);
  const savedSpecialty = equippedTitle?.specialty ?? null;
  const [preparingArtifact, setPreparingArtifact] = useState(false);
  const [preparedArtifact, setPreparedArtifact] = useState<{
    image: Blob;
    key: string;
  } | null>(null);
  const [shareNotice, setShareNotice] = useState<ShareNotice | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<TrainerBadgeId | null>(
    null,
  );
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<TrainerSpecialty | null>(null);
  const selectedTitle = titles.find(
    (title) => title.specialty === selectedSpecialty,
  );
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
  const matchingAvatars = avatarQuery.trim()
    ? searchAvatars(avatarQuery)
    : trainerAvatarOptions;
  const visibleProfile = { ...profile, specialty: savedSpecialty };
  const artifactKey = JSON.stringify([view, visibleProfile, stats, record]);
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

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !(await onProfileChange({
        ...profile,
        avatar,
        name,
        partnerPokemon: partner,
      }))
    )
      return;
    void navigate('/trainer', { replace: true });
    void requestPersistentStorage().catch(() => false);
  };

  const toggleEditor = () => {
    if (editing) {
      void navigate('/trainer', { replace: true });
      return;
    }

    setName(profile.name);
    setAvatar(profile.avatar);
    setPartner(profile.partnerPokemon);
    void navigate('/trainer/edit', { replace: true });
  };

  const setTitle = async (specialty: TrainerSpecialty | null) => {
    if (!(await onProfileChange({ ...profile, specialty }))) return false;
    setShareNotice({
      message: specialty
        ? `${trainerSpecialtyDetails[specialty].label} equipped.`
        : 'Trainer title unequipped.',
      visible: true,
    });
    void requestPersistentStorage().catch(() => false);
    return true;
  };

  const exportArtifact = async () => {
    const artifact = artifactRef.current;
    if (!artifact || preparingArtifact || view === 'pokedex') return;

    setPreparingArtifact(true);
    setShareNotice(null);
    try {
      if (canShareArtifact && preparedArtifact?.key !== artifactKey) {
        const image = await renderTrainerArtifactImage(artifact);
        setPreparedArtifact({ image, key: artifactKey });
        setShareNotice({
          message: 'PNG ready. Select Share again to open your share sheet.',
          visible: true,
        });
        return;
      }
      const outcome = await exportArtifactImage(artifact, view, {
        attemptShare: canShareArtifact,
        onShareError: 'download',
        preparedImage:
          preparedArtifact?.key === artifactKey
            ? preparedArtifact.image
            : undefined,
      });
      if (outcome !== 'cancelled') setPreparedArtifact(null);
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
            tone={!profile.name && !editing ? 'primary' : 'quiet'}
            onClick={toggleEditor}
          >
            {editing ? null : (
              <PencilSimpleIcon aria-hidden="true" weight="bold" />
            )}
            {editing
              ? 'Cancel'
              : profile.name
                ? 'Edit card'
                : 'Add trainer name'}
          </GameButton>
        ) : null}
      </header>

      {!editing ? (
        <nav aria-label="Trainer profile" className="trainer-passport__views">
          {trainerViews.map(([nextView, label, ViewIcon]) => (
            <Link
              aria-current={view === nextView ? 'page' : undefined}
              className="trainer-passport__view"
              key={nextView}
              to={trainerPath(nextView)}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                if (view === nextView) event.preventDefault();
                else {
                  playSound('tap');
                  setSelectedBadgeId(null);
                  setSelectedSpecialty(null);
                }
              }}
            >
              <ViewIcon aria-hidden="true" weight="bold" />
              {label}
            </Link>
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
          <fieldset className="trainer-avatar-picker">
            <legend>Trainer avatar</legend>
            <input
              aria-label="Search trainer avatars"
              onChange={(event) => setAvatarQuery(event.target.value)}
              placeholder="Search trainer sprites"
              type="search"
              value={avatarQuery}
            />
            <div className="trainer-avatar-picker__options">
              {matchingAvatars.map(({ id, name }) => (
                <button
                  aria-label={name}
                  aria-pressed={avatar === id}
                  key={id}
                  onClick={() => setAvatar(id)}
                  title={name}
                  type="button"
                >
                  <img
                    alt=""
                    height="80"
                    loading="lazy"
                    src={`/trainer-avatars/${id}.png`}
                    width="80"
                  />
                  <span>{name}</span>
                </button>
              ))}
              {!matchingAvatars.length && <p>No matching trainers.</p>}
            </div>
            {avatar && (
              <GameButton
                tone="quiet"
                type="button"
                onClick={() => setAvatar(null)}
              >
                Clear avatar
              </GameButton>
            )}
          </fieldset>
          <GameButton type="submit">Save card</GameButton>
        </form>
      ) : null}

      <div
        className={`trainer-passport__artifact ${view === 'front' && revealing ? 'trainer-passport__artifact--reveal' : ''}`.trim()}
      >
        {view === 'pokedex' ? (
          <TrainerPokedex catalog={catalog} foundPokemon={record.pokedex} />
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
            onSelect={(title) => setSelectedSpecialty(title.specialty)}
            stats={stats}
          />
        ) : (
          <TrainerCard
            cardRef={artifactRef}
            partnerDexNumber={savedPartner?.speciesId ?? null}
            partnerHeight={savedPartner?.height}
            partnerSprite={savedPartner?.sprite ?? null}
            partnerSpriteMeasurements={savedPartner?.spriteMeasurements}
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
              : canShareArtifact && preparedArtifact?.key === artifactKey
                ? `Share ${shareLabels[view]}`
                : canShareArtifact
                  ? `Prepare ${shareLabels[view]} PNG`
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
          onClose={() => setSelectedSpecialty(null)}
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
