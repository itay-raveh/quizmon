import { expect, it } from 'vitest';
import { completion } from '../../tests/online/progress-fixtures';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { gameSessionReducer, type GameSession } from './game-session';

it('changes next-round settings while keeping the completed result and staying on results', () => {
  const result = completion('training').result;
  const original = structuredClone(result);
  const session: GameSession = {
    phase: 'results',
    mode: { kind: 'training' },
    settings: { ...defaultGameSettings, level: result.rules!.level },
    bestResult: result,
    isNewBest: true,
    result,
    resultSaved: true,
    seed: 'completed-round',
    progressChanges: [],
  };
  const changed = gameSessionReducer(session, {
    type: 'settings-updated',
    settings: { ...session.settings, level: 4 },
  });
  expect(changed.phase).toBe('results');
  if (changed.phase !== 'results') throw new Error('Results were replaced');
  expect(changed.settings.level).toBe(4);
  expect(changed.result).toBe(result);
  expect(changed.bestResult).toBe(result);
  expect(changed.result).toEqual(original);
  expect(changed.seed).toBe(session.seed);
});
