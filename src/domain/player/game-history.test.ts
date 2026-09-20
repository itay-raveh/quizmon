import { completion } from '../../../tests/online/progress-fixtures';
import { projectGameHistory, readRecordedGame } from './game-history';
import { emptyPlayerData } from './player-save';
import { applyRecordedGame } from './game-history';

it('rebuilds progress from every round, including non-best training and failed leagues', () => {
  const training = completion(crypto.randomUUID());
  const games = [
    training,
    { ...training, completionId: crypto.randomUUID() },
    completion(crypto.randomUUID(), 'league', { failedLeague: true }),
    completion(crypto.randomUUID(), 'league'),
    completion(crypto.randomUUID(), 'daily'),
  ];
  const played = emptyPlayerData();
  for (const game of games)
    applyRecordedGame(played, { completion: game, eligible: true });
  const rebuilt = projectGameHistory(
    games.map((game) => ({
      completion: readRecordedGame(JSON.parse(JSON.stringify(game))),
      eligible: true,
    })),
  );
  expect(rebuilt.results).toEqual(played.results);
  expect(rebuilt.results.progress.correctPokemon).toContain('bulbasaur');
  expect(rebuilt.results.progress.correctCategories.type).toBe(40);
  expect(rebuilt.hallOfFame).toHaveLength(1);
  expect(Object.keys(rebuilt.results.training)).toHaveLength(1);
});

it('preserves original scores and answer evidence independently of current game versions', () => {
  const game = completion(crypto.randomUUID());
  game.contentVersion = 999;
  game.generatorVersion = 999;
  const archived = readRecordedGame(JSON.parse(JSON.stringify(game)));
  expect(archived).toEqual(game);
  expect(
    projectGameHistory([{ completion: archived, eligible: true }]).results
      .training['score:3']?.score,
  ).toBe(game.result.score);
});

it('does not count retries or a losing Daily claim twice, but retains their discoveries', () => {
  const game = completion(crypto.randomUUID(), 'daily');
  const other = {
    ...game,
    completionId: crypto.randomUUID(),
    discoveries: ['ivysaur'],
  };
  const progress = projectGameHistory([
    { completion: game, eligible: true },
    { completion: game, eligible: true },
    { completion: other, eligible: false },
  ]);
  expect(progress.results.progress.correctCategories.type).toBe(4);
  expect(progress.results.streak.creditedDates).toEqual(['2026-09-11']);
  expect(progress.pokedex).toEqual(['bulbasaur', 'ivysaur']);
});

it('retains a recorded League victory if a future challenge has a different length', () => {
  const game = completion(crypto.randomUUID(), 'league');
  game.result.answers = game.result.answers.slice(0, 10);
  game.result.correctCount = 10;
  game.result.questionCount = 10;
  const rebuilt = projectGameHistory([
    { completion: readRecordedGame(game), eligible: true },
  ]);
  expect(rebuilt.results.league.completed).toBe(true);
  expect(rebuilt.hallOfFame).toHaveLength(1);
});
