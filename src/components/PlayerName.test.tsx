import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PlayerName } from './PlayerName';

test('Champion names include the trophy and an accessible title', () => {
  const champion = renderToStaticMarkup(<PlayerName name="Ash" champion />);
  const player = renderToStaticMarkup(
    <PlayerName name="Misty" champion={false} />,
  );

  expect(champion).toContain('player-name__trophy');
  expect(champion).toContain('League Champion</span>');
  expect(player).not.toContain('player-name__trophy');
  expect(player).toContain('Misty');
});
