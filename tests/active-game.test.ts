import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
} from '@/game/active-game';
import { defaultModifiers } from '@/game/game';

const snapshot = {
  answers: [
    {
      category: 'identity' as const,
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      points: 1_000,
      questionType: 'pokedex-scan' as const,
      responseMilliseconds: 2_500,
      speedBonus: 2_120,
    },
  ],
  contentVersion: 8,
  elapsedMilliseconds: 2_500,
  mode: { kind: 'training' as const },
  modifiers: defaultModifiers,
  questionCount: 10,
  seed: 'saved-round',
};

describe('active game storage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('restores a versioned in-progress round from the current tab', () => {
    writeActiveGame(snapshot);

    expect(readActiveGame()).toEqual({ ...snapshot, version: 1 });
  });

  it('fails closed for corrupt or incompatible snapshots', () => {
    window.sessionStorage.setItem(
      'quizmon.active-game.v1',
      JSON.stringify({ ...snapshot, version: 0 }),
    );

    expect(readActiveGame()).toBeNull();
    expect(window.sessionStorage.getItem('quizmon.active-game.v1')).toBeNull();
  });

  it('clears a round when the player leaves or completes it', () => {
    writeActiveGame(snapshot);
    clearActiveGame();

    expect(readActiveGame()).toBeNull();
  });
});
