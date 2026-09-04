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
  trainerAccents,
  type TrainerAccent,
  type TrainerProfile,
} from '@/game/trainer-profile';
import {
  downloadTrainerCard,
  renderTrainerCardImage,
  shareTrainerCard,
  supportsTrainerCardSharing,
} from '@/game/trainer-card-image';
import {
  getQualifiedTrainerSpecialties,
  getTrainerBadges,
  trainerSpecialtyLabels,
  type TrainerCardFace,
  type TrainerSpecialty,
} from '@/game/trainer';
import { GameButton } from './GameButton';
import { PokemonPicker } from './PokemonPicker';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerCard } from './TrainerCard';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onBack: () => void;
  onFaceChange: (face: TrainerCardFace) => void;
  onProfileChange: (profile: TrainerProfile) => void;
  profile: TrainerProfile;
  requestedFace: TrainerCardFace;
  stats: TrainerStats;
}

interface ShareNotice {
  message: string;
  visible: boolean;
}

export const TrainerPassport = ({
  catalog,
  onBack,
  onFaceChange,
  onProfileChange,
  profile,
  requestedFace,
  stats,
}: TrainerPassportProps) => {
  const [face, setFace] = useState<TrainerCardFace>('front');
  const [turn, setTurn] = useState<'idle' | 'out' | 'in'>('idle');
  const [revealing, setRevealing] = useState(
    !profile.hasBeenRevealed && requestedFace === 'front',
  );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [partner, setPartner] = useState(profile.partnerPokemon);
  const [accent, setAccent] = useState<TrainerAccent>(profile.accent);
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
  const cardRef = useRef<HTMLElement>(null);
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
    ? { ...profile, accent, specialty }
    : { ...profile, specialty: savedSpecialty };
  const imageKey = JSON.stringify({ face, profile: visibleProfile, stats });
  const image = preparedImage?.key === imageKey ? preparedImage.blob : null;
  const canShareCard = supportsTrainerCardSharing();
  const badges = getTrainerBadges(stats);
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

  const turnTo = useCallback(
    (nextFace: TrainerCardFace) => {
      if (turn !== 'idle' || face === nextFace) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setFace(nextFace);
        return;
      }

      setTurn('out');
      const swapTimeout = window.setTimeout(() => {
        setFace(nextFace);
        setTurn('in');
        const settleTimeout = window.setTimeout(() => setTurn('idle'), 160);
        turnTimeouts.current.push(settleTimeout);
      }, 160);
      turnTimeouts.current.push(swapTimeout);
    },
    [face, turn],
  );

  useEffect(() => {
    if (requestedFace === face || turn !== 'idle') return;
    const timeoutId = window.setTimeout(() => turnTo(requestedFace), 0);
    return () => window.clearTimeout(timeoutId);
  }, [face, requestedFace, turn, turnTo]);

  useEffect(
    () => () => {
      turnTimeouts.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
    },
    [],
  );

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let active = true;
    void renderTrainerCardImage(card)
      .then((blob) => {
        if (active) setPreparedImage({ blob, key: imageKey });
      })
      .catch(() => {
        if (active) {
          setShareNotice({
            message: 'Card image could not be prepared.',
            visible: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [imageKey]);

  const flip = () => {
    if (turn !== 'idle') return;
    onFaceChange(face === 'front' ? 'records' : 'front');
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onProfileChange({
      ...profile,
      accent,
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
    setAccent(profile.accent);
    setSpecialty(savedSpecialty);
    setEditing(true);
  };

  const share = async () => {
    if (!image) return;
    setShareNotice(null);
    try {
      const outcome = await shareTrainerCard(image, face);
      if (outcome === 'unsupported') {
        downloadTrainerCard(image, face);
        setShareNotice({
          message: 'PNG downloaded. Share it from your photos.',
          visible: true,
        });
      } else if (outcome === 'shared') {
        setShareNotice({ message: 'Trainer Card shared.', visible: false });
      }
    } catch {
      downloadTrainerCard(image, face);
      setShareNotice({
        message: 'Sharing was unavailable, so the PNG was downloaded.',
        visible: true,
      });
    }
  };

  return (
    <section
      className={`trainer-passport trainer-card--accent-${visibleProfile.accent}`}
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
          <h1 id="trainer-passport-title">Trainer Card</h1>
        </div>
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
      </header>

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
          <fieldset className="trainer-customizer__accents">
            <legend>Accent color</legend>
            <div>
              {trainerAccents.map((option) => (
                <label key={option}>
                  <input
                    checked={accent === option}
                    name="trainer-accent"
                    onChange={() => setAccent(option)}
                    type="radio"
                    value={option}
                  />
                  <span
                    className={`trainer-customizer__swatch trainer-customizer__swatch--${option}`}
                    aria-hidden="true"
                  />
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <GameButton type="submit">Save card</GameButton>
        </form>
      ) : null}

      <div
        className={`trainer-passport__card trainer-passport__card--${turn} ${revealing ? 'trainer-passport__card--reveal' : ''}`.trim()}
      >
        <TrainerCard
          cardRef={cardRef}
          face={face}
          partnerDexNumber={savedPartner?.id ?? null}
          partnerSprite={savedPartner?.sprite ?? null}
          profile={visibleProfile}
          stats={stats}
        />
      </div>

      <div className="trainer-passport__controls">
        <GameButton tone="quiet" onClick={flip}>
          {face === 'front' ? 'View records' : 'View front'}
        </GameButton>
        {canShareCard ? (
          <GameButton disabled={!image} onClick={() => void share()}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 16V3m0 0L7 8m5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
            </svg>
            Share card
          </GameButton>
        ) : (
          <GameButton
            disabled={!image}
            onClick={() => image && downloadTrainerCard(image, face)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3v13m0 0 5-5m-5 5-5-5M5 20h14" />
            </svg>
            Download PNG
          </GameButton>
        )}
      </div>
      {face === 'records' ? <TrainerBadgeCase badges={badges} /> : null}
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
