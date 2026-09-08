import { buildQuestions } from '@/game/game';
import { createSeededRandom } from '@/game/random';
import { catalog } from './fixtures/catalog';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
} from '@/game/active-game';
import { defaultModifiers } from '@/game/modifiers';

const snapshot = {
  answers: [
    {
      category: 'identity' as const,
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      pokemonName: 'pikachu',
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
  questions: buildQuestions(
    catalog,
    defaultModifiers,
    createSeededRandom('saved-round'),
  ),
  seed: 'saved-round',
};

describe('active game storage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('restores a versioned in-progress round from the current tab', () => {
    writeActiveGame(snapshot);

    expect(readActiveGame()).toEqual({
      ...snapshot,
      playerRestoreId: null,
      version: 2,
    });
  });

  it('fails closed for corrupt or incompatible snapshots', () => {
    window.sessionStorage.setItem(
      'quizmon.active-game.v1',
      JSON.stringify({ ...snapshot, version: 0 }),
    );

    expect(readActiveGame()).toBeNull();
    expect(window.sessionStorage.getItem('quizmon.active-game.v1')).toBeNull();
  });

  it.each([-1, 0.5, '1', null])(
    'rejects invalid round counters: %j',
    (value) => {
      for (const patch of [
        { contentVersion: value },
        { questionCount: value },
        { answers: [{ ...snapshot.answers[0], cluesUsed: value }] },
      ]) {
        window.sessionStorage.setItem(
          'quizmon.active-game.v1',
          JSON.stringify({ ...snapshot, version: 2, ...patch }),
        );
        expect(readActiveGame()).toBeNull();
      }
    },
  );

  it.for([[], ['unknown'], null, 'I'])(
    'rejects invalid saved selections: %j',
    (value) => {
      for (const field of ['generations', 'questionTypes']) {
        window.sessionStorage.setItem(
          'quizmon.active-game.v1',
          JSON.stringify({
            ...snapshot,
            version: 2,
            modifiers: { ...defaultModifiers, [field]: value },
          }),
        );
        expect(readActiveGame()).toBeNull();
      }
    },
  );

  it('preserves the existing integer range for unfinished rounds', () => {
    writeActiveGame({
      ...snapshot,
      contentVersion: Number.MAX_SAFE_INTEGER + 1,
    });
    expect(readActiveGame()?.contentVersion).toBe(Number.MAX_SAFE_INTEGER + 1);
  });

  it('clears a round when the player leaves or completes it', () => {
    writeActiveGame(snapshot);
    clearActiveGame();

    expect(readActiveGame()).toBeNull();
  });

  it('accepts a resumable League challenge', () => {
    writeActiveGame({ ...snapshot, mode: { kind: 'league' } });

    expect(readActiveGame()?.mode).toEqual({ kind: 'league' });
  });
});
