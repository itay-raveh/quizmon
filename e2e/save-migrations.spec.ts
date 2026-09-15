import type { PlayerSave } from '../src/domain/player/player-save';
import type { ActiveGameSnapshot } from '../src/domain/player/active-game';
import fixture from '../tests/fixtures/player-save.v6.json' with { type: 'json' };
import { defaultGameSettings } from '../src/domain/settings/game-settings';
import { buildQuestions } from '../src/domain/quiz/question-generation';
import { getTrainingScoreMultipliers } from '../src/domain/quiz/score-multipliers';
import { createSeededRandom } from '../src/lib/random';
import { catalog, expect, test } from './fixtures';

for (const version of [4, 5, 6]) {
  test(`migrates schema ${version} and resumes its unfinished round across reloads`, async ({
    page,
  }) => {
    const settings = {
      ...defaultGameSettings,
      difficulty: 3 as const,
      questionSelection: 'custom' as const,
      questionTypes: ['pokedex-scan' as const],
      soundVolume: 0,
    };
    const questions = buildQuestions(
      catalog,
      settings,
      createSeededRandom('schema-6-round'),
    ).map((question) => ({ ...question, rulesVersion: 14 }));
    const first = questions[0]!;
    const answers = [
      {
        category: first.category,
        questionType: first.questionType,
        subject: first.subject,
        correct: true,
        cluesUsed: 0,
        points: 1000,
      },
    ];
    const scoreMultipliers = getTrainingScoreMultipliers(settings);
    const save = {
      ...fixture,
      version,
      data: {
        ...fixture.data,
        settings,
        generationPromptAnswered: true,
        profile: {
          version: 1,
          name: 'Leaf',
          createdAt: '2026-09-01',
          hasBeenRevealed: true,
          partnerPokemon: 'bulbasaur',
          specialty: null,
        },
      },
    };
    const round = {
      version: version === 6 ? 3 : 2,
      playerRestoreId: null,
      mode: { kind: 'training' },
      settings,
      questions,
      answers,
      ...(version === 6 ? { scoreMultipliers } : {}),
      questionCount: 10,
      elapsedMilliseconds: 2500,
      contentVersion: catalog.contentVersion,
      seed: 'schema-6-round',
    };
    await page.addInitScript(
      ({ save, round }) => {
        if (sessionStorage.getItem('quizmon.test-migrated')) return;
        localStorage.setItem('quizmon.player', JSON.stringify(save));
        sessionStorage.setItem('quizmon.active-game.v1', JSON.stringify(round));
        sessionStorage.setItem('quizmon.test-migrated', '1');
      },
      {
        save,
        round:
          version === 4
            ? (() => {
                const flat = (entry: {
                  subject: {
                    name: string;
                    generation: string;
                    types?: string[];
                  };
                }) => {
                  const { subject, ...rest } = entry;
                  return {
                    ...rest,
                    pokemonName: subject.name,
                    generation: subject.generation,
                    pokemonTypes: subject.types,
                  };
                };
                const { settings, ...rest } = round;
                return {
                  ...rest,
                  modifiers: settings,
                  questions: questions.map(flat),
                  answers: answers.map(flat),
                };
              })()
            : round,
      },
    );
    await page.goto('/');
    await expect(page.getByRole('progressbar')).toHaveText('002 / 010');
    const stored = await page.evaluate(() => ({
      player: JSON.parse(localStorage.getItem('quizmon.player')!) as PlayerSave,
      round: JSON.parse(
        sessionStorage.getItem('quizmon.active-game.v1')!,
      ) as ActiveGameSnapshot,
    }));
    expect(stored.player.version).toBe(7);
    expect(stored.player.data.profile?.name).toBe('Leaf');
    expect(stored.player.data.profile).not.toHaveProperty('version');
    expect(stored.player.data.results.progress).not.toHaveProperty('version');
    expect(stored.player.data.results.streak).not.toHaveProperty('version');
    expect(stored.round.version).toBe(7);
    expect(stored.round.answers).toEqual(answers);
    expect(stored.round.questions).toEqual(questions);
    expect(stored.round.scoreMultipliers).toEqual(
      version === 6 ? scoreMultipliers : undefined,
    );
    await page.reload();
    await expect(page.getByRole('progressbar')).toHaveText('002 / 010');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
