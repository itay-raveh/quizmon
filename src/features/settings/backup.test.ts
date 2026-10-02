import { emptyDeviceState } from '../../lib/storage/rxdb-game';
import { parseBackup } from './backup';

const backup = () => ({
  format: 'quizmon-backup-v3',
  exportedAt: '2026-09-26T10:00:00.000Z',
  accountId: null,
  schemaVersions: { players: 0, rounds: 0, device: 0 },
  player: null,
  rounds: [],
  device: [{ id: 'state', payload: emptyDeviceState() }],
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
