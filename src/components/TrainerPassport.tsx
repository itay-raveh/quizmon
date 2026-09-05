import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
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
  type TrainerView,
} from '@/game/trainer';
import { GameButton } from './GameButton';
import { LeagueGateway } from './LeagueGateway';
import { PokemonPicker } from './PokemonPicker';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerCard } from './TrainerCard';
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
  const [view, setView] = useState<TrainerView>(requestedView);
  const [turn, setTurn] = useState<'idle' | 'out' | 'in'>('idle');
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
  const [specialty, setSpecialty] = useState<TrainerSpecialty | null>(
    savedSpecialty,
  );
  const [preparedImage, setPreparedImage] = useState<{
    blob: Blob;
    key: string;
  } | null>(null);
  const [shareNotice, setShareNotice] = useState<ShareNotice | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<TrainerBadgeId | null>(
    null,
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
  const partnerSprite = partner
    ? (catalog.pokemon[partner]?.sprite ?? null)
    : null;
  const savedPartner = profile.partnerPokemon
    ? catalog.pokemon[profile.partnerPokemon]
    : null;
  const visibleProfile = editing
    ? { ...profile, specialty }
    : { ...profile, specialty: savedSpecialty };
  const finish = getCardFinish(getTrainerRank(stats)).toLowerCase();
  const imageKey = JSON.stringify({ profile: visibleProfile, stats, view });
  const image = preparedImage?.key === imageKey ? preparedImage.blob : null;
  const canShareArtifact = supportsTrainerArtifactSharing();
  const badges = getTrainerBadges(stats);
  const leagueUnlocked = isLeagueUnlocked(stats);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId) ?? null;
  const turnTimeouts = useRef<number[]>([]);

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

  const showView = useCallback(
    (nextView: TrainerView) => {
      if (turn !== 'idle' || view === nextView) return;
      if (
        view === 'titles' ||
        nextView === 'titles' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setView(nextView);
        return;
      }

      setTurn('out');
      const swapTimeout = window.setTimeout(() => {
        setView(nextView);
        setTurn('in');
        const settleTimeout = window.setTimeout(() => setTurn('idle'), 160);
        turnTimeouts.current.push(settleTimeout);
      }, 160);
      turnTimeouts.current.push(swapTimeout);
    },
    [turn, view],
  );

  useEffect(() => {
    if (requestedView === view || turn !== 'idle') return;
    const timeoutId = window.setTimeout(() => showView(requestedView), 0);
    return () => window.clearTimeout(timeoutId);
  }, [requestedView, showView, turn, view]);

  useEffect(
    () => () => {
      turnTimeouts.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
    },
    [],
  );

  useEffect(() => {
    const artifact = artifactRef.current;
    if (!artifact) return;

    let active = true;
    void renderTrainerArtifactImage(artifact)
      .then((blob) => {
        if (active) setPreparedImage({ blob, key: imageKey });
      })
      .catch(() => {
        if (active) {
          setShareNotice({
            message: 'Image could not be prepared.',
            visible: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [imageKey]);

  const selectView = (nextView: TrainerView) => {
    setSelectedBadgeId(null);
    setEditing(false);
    onViewChange(nextView);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onProfileChange({
      ...profile,
      name,
      partnerPokemon: partner,
      specialty,
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
    setSpecialty(savedSpecialty);
    setEditing(true);
  };

  const equipTitle = (nextSpecialty: TrainerSpecialty) => {
    setSpecialty(nextSpecialty);
    onProfileChange({ ...profile, specialty: nextSpecialty });
    setShareNotice({
      message: `${trainerSpecialtyLabels[nextSpecialty]} equipped.`,
      visible: true,
    });
    void requestPersistentStorage().catch(() => false);
  };

  const share = async () => {
    if (!image) return;
    setShareNotice(null);
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
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m14.5 5-7 7 7 7M8 12h9" />
          </svg>
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
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m4 20 4.3-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.3 16 4 20ZM14.8 6.2l3 3" />
              </svg>
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
              ['front', 'Card'],
              ['badges', 'Badges'],
              ['titles', 'Titles'],
            ] as const
          ).map(([nextView, label]) => (
            <button
              aria-pressed={view === nextView}
              className="trainer-passport__view"
              disabled={turn !== 'idle'}
              key={nextView}
              onClick={() => selectView(nextView)}
              type="button"
            >
              {label}
            </button>
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
          <div className="trainer-customizer__specialty">
            <label htmlFor="trainer-specialty">Trainer title</label>
            <select
              disabled={qualifiedSpecialties.length === 0}
              id="trainer-specialty"
              onChange={(event) =>
                setSpecialty((event.target.value as TrainerSpecialty) || null)
              }
              value={specialty ?? ''}
            >
              <option value="">
                {qualifiedSpecialties.length === 0
                  ? 'Earn 10 correct answers in one field'
                  : 'No title'}
              </option>
              {qualifiedSpecialties.map((option) => (
                <option key={option} value={option}>
                  {trainerSpecialtyLabels[option]}
                </option>
              ))}
            </select>
          </div>
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
        className={`trainer-passport__card trainer-passport__card--${turn} ${revealing ? 'trainer-passport__card--reveal' : ''}`.trim()}
      >
        {view === 'titles' ? (
          <TrainerTitles
            collectionRef={artifactRef}
            equipped={savedSpecialty}
            onEquip={equipTitle}
            stats={stats}
          />
        ) : (
          <TrainerCard
            cardRef={artifactRef}
            face={view}
            onBadgeSelect={(badge) => setSelectedBadgeId(badge.id)}
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
          <GameButton disabled={!image} onClick={() => void share()}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 16V3m0 0L7 8m5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
            </svg>
            Share {shareLabels[view]}
          </GameButton>
        ) : (
          <GameButton
            disabled={!image}
            onClick={() => image && downloadTrainerArtifact(image, view)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3v13m0 0 5-5m-5 5-5-5M5 20h14" />
            </svg>
            Download PNG
          </GameButton>
        )}
      </div>
      {selectedBadge ? (
        <TrainerBadgeDialog
          badge={selectedBadge}
          onClose={() => setSelectedBadgeId(null)}
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
