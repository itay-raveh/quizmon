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
        knowledgeCategories: ['scale', 'not-a-category'],
        isLimitActive: true,
        limit: 0,
        speedrunMode: true,
      }),
    ).toEqual({
      generations: ['IX'],
      knowledgeCategories: ['scale'],
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

  it('adds visuals according to the question answer type', () => {
    const questions = buildQuestions(
      catalog,
      {
        ...defaultModifiers,
        generations: [...generations],
        knowledgeCategories: [...knowledgeCategories],
        limit: knowledgeCategories.length,
      },
      createSeededRandom('question-visuals'),
    );
    const byCategory = Object.fromEntries(
      questions.map((question) => [question.category, question]),
    );

    for (const category of ['scale', 'description', 'evolution', 'stat']) {
      const question = byCategory[category];
      expect(Object.keys(question?.optionVisuals ?? {})).toHaveLength(4);
      expect(question?.media.kind).toBe('none');
    }

    for (const category of ['type', 'ability', 'move', 'matchup']) {
      expect(byCategory[category]?.media.kind).toBe('pixel-sprite');
      expect(byCategory[category]?.optionVisuals).toBeUndefined();
    }

    expect(byCategory.identity?.media.kind).toBe('sprite');
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

  it('builds scale comparisons with one measurable answer', () => {
    const questions = buildQuestions(
      catalog,
      {
        ...defaultModifiers,
        generations: [...generations],
        knowledgeCategories: ['scale'],
        limit: 20,
      },
      createSeededRandom('scale-comparisons'),
    );

    expect(questions).toHaveLength(20);
    for (const question of questions) {
      const metric = /tallest|shortest/.test(question.prompt)
        ? 'height'
        : 'weight';
      const correct = catalog.pokemon[question.correctOption]?.[metric];
      const distractors = question.options
        .filter((name) => name !== question.correctOption)
        .map((name) => catalog.pokemon[name]?.[metric]);

      expect(correct).toBeTypeOf('number');
      expect(
        distractors.every((value) =>
          /tallest|heaviest/.test(question.prompt)
            ? value! < correct!
            : value! > correct!,
        ),
      ).toBe(true);
    }
  });
});

describe('scoring', () => {
  it('awards 100 points for a normal correct answer', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, knowledgeCategories: ['scale'], limit: 1 },
      createSeededRandom('score'),
    );
    expect(question && getAnswerPoints(question, true)).toBe(100);
    expect(question && getAnswerPoints(question, false)).toBe(0);
  });

  it('adds answer points without a time multiplier', () => {
    expect(
      calculateScore([
        { category: 'identity', correct: true, points: 100 },
        { category: 'scale', correct: false, points: 0 },
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
