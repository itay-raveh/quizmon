import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { getTrainerStats } from '@/domain/player/progress';
import { emptyResults } from '@/domain/player/results';
import { createTrainerProfile } from '@/domain/player/trainer-profile';
import { PlayerName } from './PlayerName';

test('trainer names announce a League title only for champions', () => {
  const champion = renderToStaticMarkup(
    <PlayerName
      trainer={{
        profile: { ...createTrainerProfile(), name: 'Ash' },
        stats: { ...getTrainerStats(emptyResults()), leagueCompleted: true },
      }}
    />,
  );
  const player = renderToStaticMarkup(
    <PlayerName trainer={{ name: 'Misty', leagueCompleted: false }} />,
  );

  expect(champion).toContain('Ash');
  expect(champion).toContain('League Champion');
  expect(player).not.toContain('League Champion');
  expect(player).toContain('Misty');
});

test('public trainer names fall back to the player record', () => {
  const markup = renderToStaticMarkup(
    <PlayerName
      trainer={{
        player: { name: 'Blue' },
        profile: createTrainerProfile(),
        stats: getTrainerStats(emptyResults()),
      }}
    />,
  );

  expect(markup).toContain('Blue');
});
