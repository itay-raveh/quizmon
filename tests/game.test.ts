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
  getCorrectOptions,
  getKnowledgePoints,
  getMasteryBonus,
  getMaximumScore,
  getQuestionCount,
  getQuestionPromptText,
  getQuestionTitle,
  getSpeedBonus,
  getSpeedBonusPoints,
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
  it('enables every generation by default', () => {
    expect(defaultModifiers.generations).toEqual(generations);
  });

  it('returns defaults for malformed storage', () => {
    expect(normalizeModifiers('broken')).toEqual(defaultModifiers);
  });

  it('keeps valid selections and repairs an invalid limit', () => {
    expect(
      normalizeModifiers({
        generations: ['IX', 'not-a-generation'],
        knowledgeCategories: ['stat', 'not-a-category'],
        isLimitActive: true,
        limit: 0,
        speedrunMode: true,
      }),
    ).toEqual({
      generations: ['IX'],
      knowledgeCategories: ['stat'],
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
      expect(question.options).toEqual(
        expect.arrayContaining(getCorrectOptions(question)),
      );
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

    for (const category of ['description', 'stat']) {
      const question = byCategory[category];
      expect(Object.keys(question?.optionVisuals ?? {})).toHaveLength(4);
      expect(question?.media.kind).toBe('none');
    }

    for (const category of ['ability', 'move', 'matchup']) {
      expect(byCategory[category]?.media.kind).toBe('pixel-sprite');
      expect(byCategory[category]?.optionVisuals).toBeUndefined();
    }

    for (const category of ['identity', 'evolution', 'type']) {
      const question = byCategory[category];
      expect(
        question?.media.kind !== 'none' ||
          Object.keys(question.optionVisuals ?? {}).length > 0,
      ).toBe(true);
    }

    for (const category of ['ability', 'move', 'matchup']) {
      const question = byCategory[category];
      expect(question?.prompt.kind).toBe('pokemon');
      if (question?.prompt.kind === 'pokemon') {
        expect(question.prompt.name).toBe(question.pokemonName);
        expect(question.prompt.dexNumber).toBe(
          catalog.pokemon[question.pokemonName]?.id,
        );
      }
    }

    for (const category of ['description', 'stat']) {
      expect(byCategory[category]?.prompt.kind).toBe('text');
    }

    expect(getQuestionPromptText(byCategory.description!.prompt)).not.toContain(
      'belongs to',
    );
  });

  it('mixes the approved playful variants into broad knowledge topics', () => {
    const expectedTitles = {
      evolution: ['Evolution trail', 'Missing evolution', 'Evolution order'],
      identity: [
        'Pokédex scan',
        'Pixel peek',
        'Shiny spotter',
        'Silhouette match',
      ],
      type: ['Type check', 'Odd one out', 'Type roundup'],
    } as const;

    for (const [category, titles] of Object.entries(expectedTitles)) {
      const questions = buildQuestions(
        catalog,
        {
          ...defaultModifiers,
          knowledgeCategories: [category as 'evolution' | 'identity' | 'type'],
          limit: 80,
        },
        createSeededRandom(`playful-${category}`),
      );
      expect(new Set(questions.map(getQuestionTitle))).toEqual(new Set(titles));
    }
  });

  it('builds exact multi-select and ordering answer keys', () => {
    const typeQuestions = buildQuestions(
      catalog,
      { ...defaultModifiers, knowledgeCategories: ['type'], limit: 80 },
      createSeededRandom('multi-select'),
    );
    const multiSelect = typeQuestions.find(
      ({ answer }) => answer.interaction === 'multi-select',
    );
    expect(multiSelect?.answer.correctOptions.length).toBeGreaterThan(1);
    expect(multiSelect?.options).toHaveLength(4);

    const evolutionQuestions = buildQuestions(
      catalog,
      { ...defaultModifiers, knowledgeCategories: ['evolution'], limit: 80 },
      createSeededRandom('ordering'),
    );
    const ordering = evolutionQuestions.find(
      ({ answer }) => answer.interaction === 'ordering',
    );
    expect(ordering?.answer.correctOptions).toHaveLength(3);
    expect(ordering?.options).toHaveLength(3);
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
      { ...defaultModifiers, knowledgeCategories: ['stat'], limit: 1 },
      createSeededRandom('score'),
    );
    expect(question && getAnswerPoints(question, true)).toBe(100);
    expect(question && getAnswerPoints(question, false)).toBe(0);
  });

  it('adds a bounded mastery bonus to earned knowledge points', () => {
    const answers = [
      { category: 'identity', correct: true, points: 100 },
      { category: 'stat', correct: false, points: 0 },
      { category: 'champion', correct: true, points: 50 },
    ] as const;

    expect(getKnowledgePoints(answers)).toBe(150);
    expect(getMasteryBonus(answers)).toBe(75);
    expect(calculateScore(answers)).toBe(225);
    expect(getMaximumScore(answers.length)).toBe(675);
  });

  it('rewards quick answers with a bounded eight-second half-life', () => {
    expect(getSpeedBonusPoints(100, 0)).toBe(25);
    expect(getSpeedBonusPoints(100, 2_000)).toBe(21);
    expect(getSpeedBonusPoints(100, 5_000)).toBe(16);
    expect(getSpeedBonusPoints(100, 8_000)).toBe(13);
    expect(getSpeedBonusPoints(100, 16_000)).toBe(6);
    expect(getSpeedBonusPoints(100, -1)).toBe(25);
    expect(getSpeedBonusPoints(0, 0)).toBe(0);
  });

  it('combines knowledge, speed, and mastery for a perfect round', () => {
    const perfect = Array.from({ length: 10 }, () => ({
      category: 'identity' as const,
      correct: true,
      points: 100,
      responseMilliseconds: 0,
      speedBonus: 25,
    }));

    expect(getSpeedBonus(perfect)).toBe(250);
    expect(calculateScore(perfect)).toBe(2250);
    expect(getMaximumScore(perfect.length)).toBe(2250);
    expect(calculateScore([])).toBe(0);
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
