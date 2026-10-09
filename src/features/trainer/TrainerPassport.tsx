import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Form } from '@base-ui/react/form';
import { Fieldset } from '@base-ui/react/fieldset';
import { Input } from '@base-ui/react/input';
import { Button } from '@base-ui/react/button';
import { useMemo, useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { GameButton } from '../../components/GameButton';
import { Checkbox } from '../../components/Checkbox';
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
  type TrainerView,
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
import { TrainerTitlePicker } from './TrainerTitlePicker';
import { TrainerTitles } from './TrainerTitles';
import { trainerPath } from './trainer-route';

interface TrainerPassportProps {
  catalog: PokemonCatalog;
  editing: boolean;
  trainer: Pick<
    ReturnType<typeof useTrainerCard>,
    'profile' | 'stats' | 'updateProfile'
  > & { view: TrainerView };
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

export const TrainerPassport = ({
  catalog,
  trainer,
  editing,
}: TrainerPassportProps) => {
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
  const navigate = useNavigate();
  const playSound = useInteractionSound();
  const [name, setName] = useUpdateState('trainer-name', profile.name);
  const [avatar, setAvatar] = useUpdateState('trainer-avatar', profile.avatar);
  const [avatarQuery, setAvatarQuery] = useState('');
  const [partner, setPartner] = useUpdateState(
    'trainer-partner',
    profile.partnerPokemon,
  );
  const [specialty, setSpecialty] = useUpdateState(
    'trainer-specialty',
    profile.specialty,
  );
  const [usePokedexProportions, setUsePokedexProportions] = useUpdateState(
    'trainer-pokedex-proportions',
    profile.usePokedexProportions,
  );
  const activeSpecialty = editing ? specialty : profile.specialty;
  const titles = useMemo(
    () => getTrainerTitles(stats, activeSpecialty),
    [stats, activeSpecialty],
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
        label: pokemon.displayName,
        dexNumber: pokemon.speciesId,
        sprite: pokemon.sprite,
      })),
    [catalog.pokemon],
  );
  const visibleProfile = {
    ...profile,
    ...(editing
      ? { name, avatar, partnerPokemon: partner, usePokedexProportions }
      : {}),
    specialty: savedSpecialty,
  };
  const savedPartner = visibleProfile.partnerPokemon
    ? catalog.pokemon[visibleProfile.partnerPokemon]
    : null;
  const matchingAvatars = avatarQuery.trim()
    ? searchAvatars(avatarQuery)
    : trainerAvatarOptions;
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
        specialty: savedSpecialty,
        usePokedexProportions,
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
    setSpecialty(savedSpecialty);
    setUsePokedexProportions(profile.usePokedexProportions);
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
              activeOptions={{ exact: true }}
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
        <Form
          className="trainer-customizer"
          onSubmit={(event) => {
            void save(event);
          }}
        >
          <div className="trainer-customizer__name">
            <label htmlFor="trainer-name">Trainer name</label>
            <Input
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
          <TrainerTitlePicker
            titles={titles}
            value={specialty}
            onChange={setSpecialty}
          />
          <div className="trainer-customizer__proportions">
            <Checkbox
              checked={usePokedexProportions}
              label="Use Pokédex proportions"
              onCheckedChange={(checked) => setUsePokedexProportions(checked)}
            />
          </div>
          <Fieldset.Root className="trainer-avatar-picker">
            <Fieldset.Legend render={<legend />}>
              Trainer avatar
            </Fieldset.Legend>
            <Input
              aria-label="Search trainer avatars"
              onChange={(event) => setAvatarQuery(event.target.value)}
              placeholder="Search trainer sprites"
              type="search"
              value={avatarQuery}
            />
            <RadioGroup
              className="trainer-avatar-picker__options"
              aria-label="Trainer avatar"
              value={avatar}
              onValueChange={setAvatar}
            >
              {matchingAvatars.map(({ id, name }) => (
                <Radio.Root
                  nativeButton
                  render={<Button type="button" />}
                  value={id}
                  aria-label={name}
                  key={id}
                  title={name}
                >
                  <img
                    alt=""
                    height="80"
                    loading="lazy"
                    src={`/trainer-avatars/${id}.png`}
                    width="80"
                  />
                  <span>{name}</span>
                </Radio.Root>
              ))}
              {!matchingAvatars.length && <p>No matching trainers.</p>}
            </RadioGroup>
          </Fieldset.Root>
          <GameButton type="submit">Save card</GameButton>
        </Form>
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
