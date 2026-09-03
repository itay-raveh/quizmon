import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { PokemonCatalog } from '@/game/types';
import {
  requestPersistentStorage,
  type TrainerProfile,
  type TrainerStats,
} from '@/game/storage';
import {
  downloadTrainerCard,
  renderTrainerCardImage,
  shareTrainerCard,
  supportsTrainerCardSharing,
} from '@/game/trainer-card-image';
import type { TrainerCardFace } from '@/game/trainer';
import { GameButton } from './GameButton';
import { PokemonPicker } from './PokemonPicker';
import { TrainerCard } from './TrainerCard';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  onBack: () => void;
  onProfileChange: (profile: TrainerProfile) => void;
  profile: TrainerProfile;
  stats: TrainerStats;
}

export const TrainerPassport = ({
  catalog,
  onBack,
  onProfileChange,
  profile,
  stats,
}: TrainerPassportProps) => {
  const [face, setFace] = useState<TrainerCardFace>('front');
  const [turn, setTurn] = useState<'idle' | 'out' | 'in'>('idle');
  const [revealing, setRevealing] = useState(!profile.hasBeenRevealed);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [partner, setPartner] = useState(profile.partnerPokemon);
  const [preparedImage, setPreparedImage] = useState<{
    blob: Blob;
    key: string;
  } | null>(null);
  const [shareStatus, setShareStatus] = useState('');
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
  const savedPartnerSprite = profile.partnerPokemon
    ? (catalog.pokemon[profile.partnerPokemon]?.sprite ?? null)
    : null;
  const imageKey = JSON.stringify({ face, profile, stats });
  const image = preparedImage?.key === imageKey ? preparedImage.blob : null;
  const canShareCard = supportsTrainerCardSharing();

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

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let active = true;
    void renderTrainerCardImage(card)
      .then((blob) => {
        if (active) setPreparedImage({ blob, key: imageKey });
      })
      .catch(() => {
        if (active) setShareStatus('Card image could not be prepared.');
      });
    return () => {
      active = false;
    };
  }, [imageKey]);

  const flip = () => {
    if (turn !== 'idle') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFace((current) => (current === 'front' ? 'records' : 'front'));
      return;
    }
    setTurn('out');
    window.setTimeout(() => {
      setFace((current) => (current === 'front' ? 'records' : 'front'));
      setTurn('in');
      window.setTimeout(() => setTurn('idle'), 160);
    }, 160);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onProfileChange({ ...profile, name, partnerPokemon: partner });
    setEditing(false);
    void requestPersistentStorage().catch(() => false);
  };

  const share = async () => {
    if (!image) return;
    setShareStatus('');
    try {
      const outcome = await shareTrainerCard(image, face);
      if (outcome === 'unsupported') {
        downloadTrainerCard(image, face);
        setShareStatus('PNG downloaded. Share it from your photos.');
      } else if (outcome === 'shared') {
        setShareStatus('Trainer Card shared.');
      }
    } catch {
      downloadTrainerCard(image, face);
      setShareStatus('Sharing was unavailable, so the PNG was downloaded.');
    }
  };

  return (
    <section
      className="trainer-passport"
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
        <GameButton tone="quiet" onClick={() => setEditing((value) => !value)}>
          {editing ? 'Cancel' : 'Customize'}
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
        <TrainerCard
          cardRef={cardRef}
          face={face}
          partnerSprite={savedPartnerSprite}
          profile={profile}
          stats={stats}
        />
      </div>

      <div className="trainer-passport__controls">
        <GameButton tone="quiet" onClick={flip}>
          {face === 'front' ? 'View records' : 'View front'}
        </GameButton>
        {canShareCard ? (
          <GameButton disabled={!image} onClick={() => void share()}>
            Share card
          </GameButton>
        ) : (
          <GameButton
            disabled={!image}
            onClick={() => image && downloadTrainerCard(image, face)}
          >
            Download PNG
          </GameButton>
        )}
      </div>
      <p className="trainer-passport__status" aria-live="polite">
        {shareStatus}
      </p>
    </section>
  );
};
