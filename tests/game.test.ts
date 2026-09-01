import catalogData from '@/game/data/pokemon.json';
import { createSeededRandom } from '@/game/daily';
import {
  buildQuestions,
  calculateScore,
  defaultModifiers,
  filterPokemon,
  formatDuration,
  formatPokemonName,
  getAnswerPoints,
  getQuestionCount,
  normalizeModifiers,
  shuffle,
} from '@/game/game';
import {
  generations,
  knowledgeCategories,
  type PokemonCatalog,
} from '@/game/types';

const catalog = catalogData as PokemonCatalog;

describe('normalizeModifiers', () => {
  it('returns defaults for malformed storage', () => {
    expect(normalizeModifiers('broken')).toEqual(defaultModifiers);
  });

  it('keeps valid selections and repairs an invalid limit', () => {
    expect(
      normalizeModifiers({
        generations: ['IX', 'not-a-generation'],
        knowledgeCategories: ['cry', 'not-a-category'],
        isLimitActive: true,
        limit: 0,
        speedrunMode: true,
      }),
    ).toEqual({
      generations: ['IX'],
      knowledgeCategories: ['cry'],
      soundEnabled: true,
      isLimitActive: true,
      limit: 1,
      speedrunMode: true,
    });
  });

  it('restores required selections when stored arrays are empty', () => {
    expect(
      normalizeModifiers({ generations: [], knowledgeCategories: [] }),
    ).toMatchObject({
      generations: defaultModifiers.generations,
      knowledgeCategories: defaultModifiers.knowledgeCategories,
    });
  });
});

describe('question building', () => {
  it('filters the normalized catalog by generation', () => {
    const names = filterPokemon(catalog, {
      ...defaultModifiers,
      generations: ['IX'],
    });

    expect(names.length).toBeGreaterThan(100);
    expect(
      names.every((name) => catalog.pokemon[name]?.generation === 'IX'),
    ).toBe(true);
  });

  it('builds every training category with four unique options', () => {
    const questions = buildQuestions(
      catalog,
      {
        ...defaultModifiers,
        generations: [...generations],
        knowledgeCategories: [...knowledgeCategories],
        limit: knowledgeCategories.length,
      },
      createSeededRandom('all-categories'),
    );

    expect(questions).toHaveLength(knowledgeCategories.length);
    expect(new Set(questions.map(({ category }) => category))).toEqual(
      new Set(knowledgeCategories),
    );
    for (const question of questions) {
      expect(question.options).toContain(question.correctOption);
      expect(new Set(question.options).size).toBe(4);
    }
  });

  it('keeps matchup and property distractors unambiguous', () => {
    const questions = ['ability', 'move', 'matchup'].flatMap(
      (knowledgeCategory) =>
        buildQuestions(
          catalog,
          {
            ...defaultModifiers,
            generations: [...generations],
            knowledgeCategories: [
              knowledgeCategory as 'ability' | 'move' | 'matchup',
            ],
            limit: 5,
          },
          createSeededRandom(knowledgeCategory),
        ),
    );

    expect(questions).toHaveLength(15);
    expect(questions.every(({ options }) => new Set(options).size === 4)).toBe(
      true,
    );
  });
});

describe('scoring', () => {
  it('awards 100 points for a normal correct answer', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, knowledgeCategories: ['cry'], limit: 1 },
      createSeededRandom('score'),
    );
    expect(question && getAnswerPoints(question, true)).toBe(100);
    expect(question && getAnswerPoints(question, false)).toBe(0);
  });

  it('adds answer points without a time multiplier', () => {
    expect(
      calculateScore([
        { category: 'identity', correct: true, points: 100 },
        { category: 'cry', correct: false, points: 0 },
        { category: 'champion', correct: true, points: 50 },
      ]),
    ).toBe(150);
  });
});

describe('utilities', () => {
  it('clamps question counts and does not mutate shuffled input', () => {
    expect(getQuestionCount(4, { ...defaultModifiers, limit: 100 })).toBe(4);
    const input = [1, 2, 3];
    expect(shuffle(input, () => 0)).toEqual([2, 3, 1]);
    expect(input).toEqual([1, 2, 3]);
  });

  it('formats durations and API names', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatPokemonName('special-attack')).toBe('Special Attack');
  });
});
