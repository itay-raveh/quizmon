import type { ActiveGameSnapshot } from '../../domain/player/active-game';
import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import {
  resetLocalSave,
  seedActiveFixture,
} from '../../../tests/fixtures/local-save';
import { buildQuestions } from '../../domain/quiz/question-generation';
import { buildQuestionType } from '../../domain/quiz/questions/registry';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { createSeededRandom } from '../random';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
} from './active-game-storage';
import { readLocalRound } from './round-storage';

beforeEach(resetLocalSave);

const snapshot: Omit<ActiveGameSnapshot, 'version'> = {
  roundId: crypto.randomUUID(),
  answers: [],
  contentVersion: 8,
  elapsedMilliseconds: 2500,
  mode: { kind: 'training' },
  settings: defaultGameSettings,
  questionCount: 10,
  questions: buildQuestions(
    catalog,
    defaultGameSettings,
    createSeededRandom('saved-round'),
  ),
  seed: 'saved-round',
};
const question = snapshot.questions[0]!;
const answer = {
  category: question.category,
  cluesUsed: 0,
  correct: true,
  points: 1000,
  questionType: question.questionType,
  responseMilliseconds: 1234,
  speedBonus: 250,
  subject: {
    kind: 'pokemon' as const,
    generation: question.subject.generation,
    name: question.subject.name,
  },
};
describe('active game storage', () => {
  it('restores a versioned in-progress round from the current tab', async () => {
    await writeActiveGame(snapshot);

    expect(readActiveGame(catalog)).toEqual({
      ...snapshot,
      playerRestoreId: null,
      version: 7,
    });
  });

  it('does not assign difficulty to a legacy unfinished round', async () => {
    const settings = { ...snapshot.settings };
    delete settings.difficulty;
    delete settings.questionSelection;
    await writeActiveGame({ ...snapshot, settings });
    expect(readActiveGame(catalog)?.settings).toEqual(settings);
    expect(readActiveGame(catalog)?.questions).toEqual(snapshot.questions);
  });

  it('restores the original Daily track rather than a later selection', async () => {
    const mode = {
      kind: 'daily' as const,
      date: '2026-09-12',
      track: { difficulty: 5 as const, scope: 'gen-i' as const },
    };
    await writeActiveGame({ ...snapshot, mode });
    expect(readActiveGame(catalog)?.mode).toEqual(mode);
  });

  it('fails closed for corrupt or incompatible snapshots', async () => {
    await seedActiveFixture({ ...snapshot, version: 0 });

    expect(readActiveGame(catalog)).toBeNull();
  });
  it.each([-1, 0.5, '1', null])(
    'rejects invalid round counters: %j',
    async (value) => {
      for (const patch of [
        { contentVersion: value },
        { questionCount: value },
        { answers: [{ ...answer, cluesUsed: value }] },
      ]) {
        await seedActiveFixture({ ...snapshot, version: 7, ...patch });
        expect(readActiveGame(catalog)).toBeNull();
      }
    },
  );
  it.for([[], ['unknown'], null, 'I'])(
    'rejects invalid saved selections: %j',
    async (value) => {
      for (const field of ['generations', 'questionTypes']) {
        await seedActiveFixture({
          ...snapshot,
          version: 7,
          settings: { ...defaultGameSettings, [field]: value },
        });
        expect(readActiveGame(catalog)).toBeNull();
      }
    },
  );

  it('accepts compatible questions across catalog versions', async () => {
    await writeActiveGame({
      ...snapshot,
      contentVersion: Number.MAX_SAFE_INTEGER + 1,
    });
    expect(readActiveGame(catalog)?.contentVersion).toBe(
      Number.MAX_SAFE_INTEGER + 1,
    );
  });

  it('clears a round when the player leaves or completes it', async () => {
    await writeActiveGame(snapshot);
    await clearActiveGame();

    expect(readActiveGame(catalog)).toBeNull();
  });

  it('accepts a resumable League challenge', async () => {
    await writeActiveGame({ ...snapshot, mode: { kind: 'league' } });

    expect(readActiveGame(catalog)?.mode).toEqual({ kind: 'league' });
  });
  it.each(['training', 'daily', 'league'] as const)(
    'preserves a %s round across a catalog update',
    async (kind) => {
      await writeActiveGame({
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

  it('rejects a removed Pokémon reference at the loading edge', async () => {
    await writeActiveGame(snapshot);
    const pokemon = { ...catalog.pokemon };
    delete pokemon[snapshot.questions[0]!.subject.name];
    expect(readActiveGame({ ...catalog, pokemon })).toBeNull();
  });

  it('rejects removed variants in saved rotation subjects at the loading edge', async () => {
    const question = snapshot.questions[0]!;
    await writeActiveGame({
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
  });

  it('corrects a saved variety ID to its National Pokédex number without regenerating the question', async () => {
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
    await writeActiveGame({
      ...snapshot,
      questionCount: 1,
      questions: [question],
    });
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
  ] as const)('normalizes every saved Pokédex number in %s', async (type) => {
    const question = buildQuestionType(createQuestionContext(type), type)!;
    const legacy = JSON.parse(
      JSON.stringify(question),
      (key, value: unknown) => (key === 'dexNumber' ? 999999 : value),
    ) as typeof question;
    if (legacy.optionDexNumbers)
      for (const name of Object.keys(legacy.optionDexNumbers))
        legacy.optionDexNumbers[name] = 999_999;

    await writeActiveGame({
      ...snapshot,
      questionCount: 1,
      questions: [legacy],
    });
    const stored = JSON.stringify(readLocalRound());
    expect(readActiveGame(catalog)?.questions).toEqual([question]);
    expect(JSON.stringify(readLocalRound())).toBe(stored);
  });

  it('rejects answers that do not belong to the stored question', async () => {
    const question = snapshot.questions[0]!;
    await writeActiveGame({
      ...snapshot,
      answers: [
        {
          category: question.category,
          cluesUsed: 0,
          correct: true,
          points: 1000,
          questionType: question.questionType,
          subject: {
            kind: 'pokemon' as const,
            generation: question.subject.generation,
            name: 'missing-pokemon',
          },
        },
      ],
    });
    expect(readActiveGame(catalog)).toBeNull();
  });
});

it.each([2, 3, 4, 5, 6])(
  'rejects pre-reset round format %i',
  async (version) => {
    await seedActiveFixture({ ...snapshot, version });
    expect(readActiveGame(catalog)).toBeNull();
  },
);
