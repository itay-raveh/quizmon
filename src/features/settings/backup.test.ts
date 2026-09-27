import { emptyDeviceState } from '../../lib/storage/rxdb-game';
import { parseBackup } from './backup';

const backup = () => ({
  format: 'quizmon-backup',
  exportedAt: '2026-09-26T10:00:00.000Z',
  accountId: null,
  schemaVersions: { players: 0, rounds: 0, device: 0 },
  player: null,
  rounds: [],
  device: [{ id: 'state', payload: emptyDeviceState() }],
});

it('validates backup identity and device data before any restore writes', async () => {
  expect((await parseBackup(JSON.stringify(backup()))).accountId).toBeNull();
  await expect(
    parseBackup(
      JSON.stringify({
        ...backup(),
        accountId: 'other',
        player: { id: 'guest', ownerId: 'guest', profile: {}, settings: null },
      }),
    ),
  ).rejects.toThrow('invalid player');
  await expect(
    parseBackup(
      JSON.stringify({
        ...backup(),
        device: [{ id: 'state', payload: { dailyAttempts: {} } }],
      }),
    ),
  ).rejects.toThrow();
  await expect(
    parseBackup(
      JSON.stringify({
        ...backup(),
        device: [...backup().device, ...backup().device],
      }),
    ),
  ).rejects.toThrow('duplicate records');
  await expect(
    parseBackup(
      JSON.stringify({
        ...backup(),
        schemaVersions: { players: 1, rounds: 0, device: 0 },
      }),
    ),
  ).rejects.toThrow('newer version');
});
