import { useMemo, useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { GameButton } from '../../components/GameButton';
import { useInteractionSound } from '../../lib/audio/sound-context';
import {
  BookOpenIcon,
  CardholderIcon,
  CertificateIcon,
  MedalIcon,
  PencilSimpleIcon,
} from '../../components/icons';
import { getDailyStreak } from '../../domain/player/progress';
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
} from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getUtcDate } from '../../domain/quiz/daily';
import { requestPersistentStorage } from '../../lib/storage/persistent-storage';
import { readPlayerData } from '../../lib/storage/player-storage';
import { useUpdateState } from '../../lib/storage/update-reload-state';
import type { useTrainerCard } from './useTrainerCard';
import { PokemonPicker } from './PokemonPicker';
import { TrainerBadgeCase } from './TrainerBadgeCase';
import { TrainerBadgeDialog } from './TrainerBadgeDialog';
import { TrainerCard } from './TrainerCard';
import { TrainerPokedex } from './TrainerPokedex';
import { TrainerTitleDialog } from './TrainerTitleDialog';
import { TrainerTitles } from './TrainerTitles';
import { trainerPath } from './trainer-route';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  trainer: Pick<
    ReturnType<typeof useTrainerCard>,
    'profile' | 'stats' | 'updateProfile' | 'view'
  >;
}

const trainerViews = [
  ['front', 'Card', CardholderIcon],
  ['badges', 'Badges', MedalIcon],
  ['titles', 'Titles', CertificateIcon],
  ['pokedex', 'Pokédex', BookOpenIcon],
] as const;

const searchAvatars = createSearch(
  trainerAvatarOptions.map((avatar) => ({
    ...avatar,
    label: avatar.name,
    normalized: normalizeSearch(avatar.name),
    aliases: [normalizeSearch(avatar.id)],
  })),
);

export const TrainerPassport = ({ catalog, trainer }: TrainerPassportProps) => {
  const { profile, stats, updateProfile: onProfileChange, view } = trainer;
  const data = readPlayerData();
  const found = new Set(data.pokedex);
  const pokemon = Object.keys(catalog.pokemon);
  const record = {
    dayCombo: getDailyStreak(data.results.streak.creditedDates, getUtcDate()),
    pokedex: data.pokedex,
    pokedexFound: pokemon.filter((name) => found.has(name)).length,
    pokedexTotal: pokemon.length,
  };
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
  const [notice, setNotice] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState<TrainerBadgeId | null>(
    null,
  );
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<TrainerSpecialty | null>(null);
  const selectedTitle = titles.find(
    (title) => title.specialty === selectedSpecialty,
  );
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
  const rank = getTrainerRank(stats);
  const finish = getCardFinish(rank).toLowerCase();
  const badges = getTrainerBadges(stats, catalog);
  const selectedBadge = badges.find(({ id }) => id === selectedBadgeId) ?? null;

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
    void navigate({ to: '/trainer', replace: true });
    void requestPersistentStorage().catch(() => false);
  };

  const toggleEditor = () => {
    if (editing) {
      void navigate({ to: '/trainer', replace: true });
      return;
    }

    setName(profile.name);
    setAvatar(profile.avatar);
    setPartner(profile.partnerPokemon);
    void navigate({ to: '/trainer/edit', replace: true });
  };

  const setTitle = async (specialty: TrainerSpecialty | null) => {
    if (!(await onProfileChange({ ...profile, specialty }))) return false;
    setNotice(
      specialty
        ? `${trainerSpecialtyDetails[specialty].label} equipped.`
        : 'Trainer title unequipped.',
    );
    void requestPersistentStorage().catch(() => false);
    return true;
  };

  return (
    <section
      className={`game-panel trainer-passport trainer-passport--${finish}`}
      aria-labelledby="trainer-passport-title"
    >
      <header className="game-panel__header trainer-passport__header">
        <h1 className="game-panel__title" id="trainer-passport-title">
          {trainerViewLabels[view]}
        </h1>
        {view === 'front' ? (
          <GameButton
            aria-label={
              editing
                ? 'Cancel editing Trainer Card'
                : profile.name
                  ? 'Edit Trainer Card'
                  : 'Add trainer name'
            }
            className="game-button--icon-edit"
            tone="quiet"
            onClick={toggleEditor}
          >
            <PencilSimpleIcon aria-hidden="true" weight="bold" />
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

      <div className="trainer-passport__artifact">
        {view === 'pokedex' ? (
          <TrainerPokedex catalog={catalog} foundPokemon={record.pokedex} />
        ) : view === 'badges' ? (
          <TrainerBadgeCase
            badges={badges}
            onSelect={(badge) => setSelectedBadgeId(badge.id)}
          />
        ) : view === 'titles' ? (
          <TrainerTitles
            equipped={savedSpecialty}
            onSelect={(title) => setSelectedSpecialty(title.specialty)}
            stats={stats}
          />
        ) : (
          <TrainerCard
            partnerDexNumber={savedPartner?.speciesId ?? null}
            partnerHeight={savedPartner?.height}
            partnerSprite={savedPartner?.sprite ?? null}
            partnerSpriteMeasurements={savedPartner?.spriteMeasurements}
            trainer={{ profile: visibleProfile, stats }}
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
          onClose={() => setSelectedSpecialty(null)}
          onEquip={(title) => setTitle(title.specialty)}
          onUnequip={() => setTitle(null)}
          title={selectedTitle}
        />
      ) : null}
      {notice && (
        <p className="trainer-passport__status" aria-live="polite">
          {notice}
        </p>
      )}
    </section>
  );
};
