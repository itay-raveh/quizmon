import catalogData from '@/game/data/pokemon.json';
import {
  buildLeagueQuestions,
  getLeagueModifiers,
  getLeagueQuestionTypes,
  getLeagueStage,
  isLeagueVictory,
  LEAGUE_QUESTION_COUNT,
} from '@/game/league';
import { questionTypes } from '@/game/questions/registry';
import {
  generations,
  type GameResult,
  type PokemonCatalog,
} from '@/game/types';

const catalog = catalogData as PokemonCatalog;

describe('Quizmon League', () => {
  it('builds one deterministic question from every format', () => {
    const first = buildLeagueQuestions(catalog, 'league-lineup', {
      answerFlow: 'manual',
      reduceMotion: false,
      soundVolume: 0,
      timerDisplay: 'seconds',
    });
    const second = buildLeagueQuestions(catalog, 'league-lineup', {
      answerFlow: 'instant',
      reduceMotion: true,
      soundVolume: 1,
      timerDisplay: 'milliseconds',
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(LEAGUE_QUESTION_COUNT);
    expect(new Set(first.map(({ questionType }) => questionType))).toEqual(
      new Set([...questionTypes, 'champion']),
    );
    expect(first.at(-1)?.questionType).toBe('champion');
  });

  it('keeps a fixed five-stage structure while varying its lineup by seed', () => {
    const first = getLeagueQuestionTypes('first');
    const second = getLeagueQuestionTypes('second');

    expect(first).not.toEqual(second);
    expect(getLeagueStage(1)).toMatchObject({ heading: 'Elite Trial I' });
    expect(getLeagueStage(12)).toMatchObject({ heading: 'Elite Trial IV' });
    expect(getLeagueStage(15)).toMatchObject({ heading: 'Champion' });
  });

  it('uses every generation and requires a complete perfect result', () => {
    expect(
      getLeagueModifiers({
        answerFlow: 'instant',
        reduceMotion: true,
        soundVolume: 0,
        timerDisplay: 'hidden',
      }),
    ).toMatchObject({
      generations: [...generations],
      answerFlow: 'instant',
      reduceMotion: true,
      soundVolume: 0,
      timerDisplay: 'hidden',
    });

    const answers = Array.from({ length: LEAGUE_QUESTION_COUNT }, () => ({
      category: 'identity' as const,
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      pokemonName: 'pikachu',
      points: 1_000,
      questionType: 'pokedex-scan' as const,
    }));
    const result: GameResult = {
      answers,
      contentVersion: 1,
      correctCount: LEAGUE_QUESTION_COUNT,
      elapsedSeconds: 30,
      questionCount: LEAGUE_QUESTION_COUNT,
      score: 60_000,
      scoreVersion: 2,
    };

    expect(isLeagueVictory(result)).toBe(true);
    expect(isLeagueVictory({ ...result, answers: answers.slice(0, -1) })).toBe(
      false,
    );
    expect(isLeagueVictory({ ...result, correctCount: 14 })).toBe(false);
  });
});
