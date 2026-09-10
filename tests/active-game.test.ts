import { buildQuestions } from '@/game/game';
import { createSeededRandom } from '@/game/random';
import { catalog, createQuestionContext } from './fixtures/catalog';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
  type ActiveGameSnapshot,
} from '@/game/active-game';
import { defaultModifiers } from '@/game/modifiers';
import { buildQuestionType } from '@/game/questions/registry';

const snapshot: Omit<ActiveGameSnapshot, 'version'> = {
  answers: [],
  contentVersion: 8,
  elapsedMilliseconds: 2_500,
  mode: { kind: 'training' },
  modifiers: defaultModifiers,
  questionCount: 10,
  questions: buildQuestions(
    catalog,
    defaultModifiers,
    createSeededRandom('saved-round'),
  ),
  seed: 'saved-round',
};

const question = snapshot.questions[0]!;
const answer = {
  category: question.category,
  cluesUsed: 0,
  correct: true,
  generation: question.generation,
  pokemonName: question.pokemonName,
  points: 1000,
  questionType: question.questionType,
  responseMilliseconds: 1234,
  speedBonus: 250,
};

describe('active game storage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('restores a versioned in-progress round from the current tab', () => {
    writeActiveGame(snapshot);

    expect(readActiveGame(catalog)).toEqual({
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

    expect(readActiveGame(catalog)).toBeNull();
    expect(window.sessionStorage.getItem('quizmon.active-game.v1')).toBeNull();
  });

  it.each([-1, 0.5, '1', null])(
    'rejects invalid round counters: %j',
    (value) => {
      for (const patch of [
        { contentVersion: value },
        { questionCount: value },
        { answers: [{ ...answer, cluesUsed: value }] },
      ]) {
        window.sessionStorage.setItem(
          'quizmon.active-game.v1',
          JSON.stringify({ ...snapshot, version: 2, ...patch }),
        );
        expect(readActiveGame(catalog)).toBeNull();
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
        expect(readActiveGame(catalog)).toBeNull();
      }
    },
  );

  it('accepts compatible questions across catalog versions', () => {
    writeActiveGame({
      ...snapshot,
      contentVersion: Number.MAX_SAFE_INTEGER + 1,
    });
    expect(readActiveGame(catalog)?.contentVersion).toBe(
      Number.MAX_SAFE_INTEGER + 1,
    );
  });

  it('clears a round when the player leaves or completes it', () => {
    writeActiveGame(snapshot);
    clearActiveGame();

    expect(readActiveGame(catalog)).toBeNull();
  });

  it('accepts a resumable League challenge', () => {
    writeActiveGame({ ...snapshot, mode: { kind: 'league' } });

    expect(readActiveGame(catalog)?.mode).toEqual({ kind: 'league' });
  });

  it.each(['training', 'daily', 'league'] as const)(
    'preserves a %s round across a catalog update',
    (kind) => {
      writeActiveGame({
        ...snapshot,
        contentVersion: 14,
        answers: [answer],
        mode: kind === 'daily' ? { kind, date: '2026-09-10' } : { kind },
      });
      const restored = readActiveGame(catalog)!;
      expect(restored.questions).toEqual(snapshot.questions);
      expect(restored.answers).toEqual([answer]);
      expect(restored.elapsedMilliseconds).toBe(snapshot.elapsedMilliseconds);
      expect(restored.contentVersion).toBe(14);
    },
  );

  it('rejects a removed Pokémon reference at the loading edge', () => {
    writeActiveGame(snapshot);
    const pokemon = { ...catalog.pokemon };
    delete pokemon[snapshot.questions[0]!.pokemonName];
    expect(readActiveGame({ ...catalog, pokemon })).toBeNull();
  });

  it('rejects removed variants in saved rotation subjects at the loading edge', () => {
    const question = snapshot.questions[0]!;
    writeActiveGame({
      ...snapshot,
      questionCount: 1,
      questions: [
        {
          ...question,
          repetition: { ...question.repetition, subjects: ['unown-b'] },
        },
      ],
    });
    expect(readActiveGame(catalog)).toBeNull();
    expect(sessionStorage.getItem('quizmon.active-game.v1')).toBeNull();
  });

  it('corrects a saved variety ID to its National Pokédex number without regenerating the question', () => {
    const name = 'rotom-wash';
    const pokemon = catalog.pokemon[name]!;
    const question = buildQuestionType(
      {
        catalog,
        pool: [{ name, pokemon }],
        used: new Set(),
        random: createSeededRandom('legacy-rotom-number'),
      },
      'type-check',
    )!;
    expect(pokemon.pokemonId).not.toBe(pokemon.speciesId);
    if (question.prompt.kind !== 'pokemon')
      throw new Error('Expected a named question');
    const expected = structuredClone(question);
    question.prompt.dexNumber = pokemon.pokemonId;
    writeActiveGame({ ...snapshot, questionCount: 1, questions: [question] });
    const restored = readActiveGame(catalog)!;
    expect(restored.questions).toEqual([expected]);
    expect(restored.contentVersion).toBe(snapshot.contentVersion);
    expect(restored.elapsedMilliseconds).toBe(snapshot.elapsedMilliseconds);
  });

  it.each([
    'type-check',
    'sprite-match',
    'evolution-link',
    'evolution-shift',
    'champion',
  ] as const)('normalizes every saved Pokédex number in %s', (type) => {
    const question = buildQuestionType(createQuestionContext(type), type)!;
    const legacy = JSON.parse(
      JSON.stringify(question),
      (key, value: unknown) => (key === 'dexNumber' ? 999_999 : value),
    ) as typeof question;
    if (legacy.optionDexNumbers)
      for (const name of Object.keys(legacy.optionDexNumbers))
        legacy.optionDexNumbers[name] = 999_999;

    writeActiveGame({ ...snapshot, questionCount: 1, questions: [legacy] });
    const stored = sessionStorage.getItem('quizmon.active-game.v1');
    expect(readActiveGame(catalog)?.questions).toEqual([question]);
    expect(sessionStorage.getItem('quizmon.active-game.v1')).toBe(stored);
  });

  it('rejects answers that do not belong to the stored question', () => {
    const question = snapshot.questions[0]!;
    writeActiveGame({
      ...snapshot,
      answers: [
        {
          category: question.category,
          cluesUsed: 0,
          correct: true,
          generation: question.generation,
          pokemonName: 'missing-pokemon',
          points: 1000,
          questionType: question.questionType,
        },
      ],
    });
    expect(readActiveGame(catalog)).toBeNull();
  });
});
