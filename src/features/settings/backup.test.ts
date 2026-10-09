import { legacyProgress } from '../../../tests/legacy-progress';
import { scoreCompactRound } from '../../domain/sync/compact-rounds';
import { backupPreview } from './backup';
import { emptyDeviceState } from '../../lib/storage/rxdb-game';
import { parseBackup } from './backup';
import { createTrainerProfile } from '../../domain/player/trainer-profile';

const backup = () => ({
  format: 'quizmon-backup-v3',
  exportedAt: '2026-09-26T10:00:00.000Z',
  accountId: null,
  schemaVersions: { players: 0, rounds: 0, device: 0 },
  player: null,
  rounds: [],
  device: [{ id: 'state', payload: emptyDeviceState() }],
});

it('restores older profiles with readable proportions and preserves explicit choices', () => {
  const legacyProfile = createTrainerProfile();
  Reflect.deleteProperty(legacyProfile, 'usePokedexProportions');
  const restore = (profile: unknown) =>
    parseBackup(
      JSON.stringify({
        ...backup(),
        player: { id: 'guest', profile, settings: null },
      }),
    );
  expect(restore(legacyProfile).player?.profile.usePokedexProportions).toBe(
    false,
  );
  expect(
    restore({ ...legacyProfile, usePokedexProportions: true }).player?.profile
      .usePokedexProportions,
  ).toBe(true);
  expect(() =>
    restore({ ...legacyProfile, usePokedexProportions: 'true' }),
  ).toThrow();
});

it('validates backup identity and device data before any restore writes', () => {
  expect(parseBackup(JSON.stringify(backup())).accountId).toBeNull();
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup(),
        accountId: 'other',
        player: { id: 'guest', profile: {}, settings: null },
      }),
    ),
  ).toThrow('invalid player');
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup(),
        device: [{ id: 'state', payload: { dailyAttempts: {} } }],
      }),
    ),
  ).toThrow();
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup(),
        device: [...backup().device, ...backup().device],
      }),
    ),
  ).toThrow('duplicate records');
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup(),
        schemaVersions: { players: 2, rounds: 0, device: 0 },
      }),
    ),
  ).toThrow('newer version');
  expect(() =>
    parseBackup(JSON.stringify({ ...backup(), format: 'quizmon-backup' })),
  ).toThrow('valid Quizmon backup');
  expect(() =>
    parseBackup(JSON.stringify({ ...backup(), format: 'quizmon-backup-v2' })),
  ).toThrow('valid Quizmon backup');
});

it('drops obsolete unfinished rounds from a backup', () => {
  const parsed = parseBackup(
    JSON.stringify({
      ...backup(),
      device: [
        ...backup().device,
        { id: 'round:old-tab', payload: { retired: true } },
        { id: 'closed:old-round', payload: { reason: 'left' } },
      ],
    }),
  );
  expect(parsed.device).toEqual(backup().device);
});

it('automatically converts an older export before preview without changing raw answers, identity or explicit preferences', () => {
  const fixture = legacyProgress();
  const source = {
    ...backup(),
    player: fixture.player,
    rounds: [fixture.legacy],
  };
  const parsed = parseBackup(JSON.stringify(source));
  expect(parsed.rounds).toEqual([fixture.current]);
  expect(scoreCompactRound(parsed.rounds[0]!)).toEqual(
    scoreCompactRound(fixture.current),
  );
  expect(parsed.player?.profile).toEqual(source.player.profile);
  expect(parsed.player?.settings?.questionTypes).toEqual([
    'pokemonIdentification',
    'pokemonMatch',
    'pokemonTypes',
  ]);
  expect(parsed.player?.settings?.questionSelection).toBe('custom');
  expect(backupPreview(parsed).results.training.score?.score).toBeGreaterThan(
    0,
  );
  expect(parseBackup(JSON.stringify(parsed))).toEqual(parsed);
  expect(source.rounds[0]!.answers[0]!.type).toBe(
    'pokemonFromHistoricalSprite',
  );
});
