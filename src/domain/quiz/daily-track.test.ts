import {
  dailyTracks,
  getDailyResultKey,
  parseDailyResultKey,
} from './daily-track';

describe('shared Daily tracks', () => {
  it('defines ten unique date-and-track identities', () => {
    const keys = dailyTracks.map((track) =>
      getDailyResultKey('2026-09-12', track),
    );
    expect(new Set(keys).size).toBe(10);
    keys.forEach((key, index) =>
      expect(parseDailyResultKey(key)).toEqual({
        date: '2026-09-12',
        track: dailyTracks[index],
      }),
    );
  });

  it('preserves legacy dates without inventing a track', () => {
    expect(parseDailyResultKey('2026-09-12')).toEqual({ date: '2026-09-12' });
    expect(getDailyResultKey('2026-09-12')).toBe('2026-09-12');
  });

  it.each([
    '2026-09-12:0:all',
    '2026-09-12:6:all',
    '2026-09-12:01:all',
    '2026-09-12:2:ii',
    '2026-09-12:2:all:extra',
    'no-date:2:all',
  ])('rejects invalid identity %s', (key) =>
    expect(parseDailyResultKey(key)).toBeUndefined(),
  );
});
