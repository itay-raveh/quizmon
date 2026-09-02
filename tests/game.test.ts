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
  getQuestionCount,
  getQuestionPromptText,
  getQuestionTitle,
  getQuestionTypeLabel,
  getSpeedBonus,
  getSpeedBonusPoints,
  normalizeModifiers,
  shuffle,
} from '@/game/game';
import { generations, questionTypes, type PokemonCatalog } from '@/game/types';

const catalog = catalogData as PokemonCatalog;

const attackMultiplier = (
  attackType: string,
  defenderTypes: readonly string[],
): number => {
  const relations = catalog.typeRelations[attackType];
  if (!relations) return 1;
  return defenderTypes.reduce((multiplier, defenderType) => {
    if (relations.noneTo.includes(defenderType)) return 0;
    if (relations.doubleTo.includes(defenderType)) return multiplier * 2;
    if (relations.halfTo.includes(defenderType)) return multiplier / 2;
    return multiplier;
  }, 1);
};

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
        questionTypes: ['stat-showdown', 'not-a-type'],
        isLimitActive: true,
        limit: 0,
        speedrunMode: true,
      }),
    ).toEqual({
      generations: ['IX'],
      questionTypes: ['stat-showdown'],
      soundEnabled: true,
      isLimitActive: true,
      limit: 1,
      speedrunMode: true,
    });
  });

  it('restores required selections when stored arrays are empty', () => {
    expect(
      normalizeModifiers({ generations: [], questionTypes: [] }),
    ).toMatchObject({
      generations: defaultModifiers.generations,
      questionTypes: defaultModifiers.questionTypes,
    });
  });

  it('drops removed question types from saved settings', () => {
    expect(
      normalizeModifiers({
        questionTypes: ['evolution-order', 'evolution-trail', 'type-check'],
      }).questionTypes,
    ).toEqual(['type-check']);
  });

  it('adds new formats to a previously complete selection', () => {
    const previousQuestionTypes = questionTypes.filter(
      (questionType) =>
        !['battle-view', 'evolution-shift', 'counter-pick'].includes(
          questionType,
        ),
    );

    expect(
      normalizeModifiers({ questionTypes: previousQuestionTypes })
        .questionTypes,
    ).toEqual(questionTypes);
  });

  it('migrates broad topic settings to their concrete question types', () => {
    expect(
      normalizeModifiers({
        generations: ['I'],
        knowledgeCategories: ['identity', 'evolution'],
      }).questionTypes,
    ).toEqual([
      'pokedex-scan',
      'silhouette-match',
      'pixel-peek',
      'shiny-spotter',
      'battle-view',
      'evolution-shift',
    ]);
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

  it('builds every selected question type with unique options', () => {
    const questions = buildQuestions(
      catalog,
      {
        ...defaultModifiers,
        generations: [...generations],
        questionTypes: [...questionTypes],
        limit: questionTypes.length,
      },
      createSeededRandom('all-categories'),
    );

    expect(questions).toHaveLength(questionTypes.length);
    expect(new Set(questions.map(getQuestionTitle))).toEqual(
      new Set(questionTypes.map(getQuestionTypeLabel)),
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
        questionTypes: [
          'field-notes',
          'stat-showdown',
          'ability-check',
          'move-check',
          'type-matchup',
          'pokedex-scan',
          'evolution-shift',
          'type-check',
        ],
        limit: 8,
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

  it('builds an exact multi-select answer key', () => {
    const [multiSelect] = buildQuestions(
      catalog,
      { ...defaultModifiers, questionTypes: ['type-roundup'], limit: 1 },
      createSeededRandom('multi-select'),
    );
    expect(multiSelect?.answer.correctOptions.length).toBeGreaterThan(1);
    expect(multiSelect?.options).toHaveLength(4);
  });

  it('builds Counter Pick with one genuine type advantage', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, questionTypes: ['counter-pick'], limit: 1 },
      createSeededRandom('counter-pick'),
    );
    expect(question?.title).toBe('Counter pick');
    expect(Object.keys(question?.optionVisuals ?? {})).toHaveLength(4);

    const defender = catalog.pokemon[question!.pokemonName]!;
    const correct = getCorrectOptions(question!)[0];
    for (const option of question!.options) {
      const attacker = catalog.pokemon[option]!;
      const hasAdvantage = attacker.types.some(
        (type) => attackMultiplier(type, defender.types) > 1,
      );
      expect(hasAdvantage).toBe(option === correct);
    }
  });

  it('builds Evolution Shift from a real typing change', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, questionTypes: ['evolution-shift'], limit: 1 },
      createSeededRandom('evolution-shift'),
    );
    expect(question?.title).toBe('Evolution shift');
    expect(question?.media.kind).toBe('pixel-sprite');

    const target = catalog.pokemon[question!.pokemonName]!;
    const evolution = catalog.pokemon[target.evolvesTo[0]!]!;
    const correct = getCorrectOptions(question!)[0]!;
    expect(target.types).not.toContain(correct);
    expect(evolution.types).toContain(correct);
  });

  it('builds Battle View from the target back sprite', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, questionTypes: ['battle-view'], limit: 1 },
      createSeededRandom('battle-view'),
    );
    expect(question?.title).toBe('Battle view');
    expect(question?.media).toEqual({
      kind: 'sprite',
      silhouette: false,
      src: catalog.pokemon[question!.pokemonName]?.backSprite,
    });
  });
});

describe('scoring', () => {
  it('awards 1,000 points for a normal correct answer', () => {
    const [question] = buildQuestions(
      catalog,
      { ...defaultModifiers, questionTypes: ['stat-showdown'], limit: 1 },
      createSeededRandom('score'),
    );
    expect(question && getAnswerPoints(question, true)).toBe(1_000);
    expect(question && getAnswerPoints(question, false)).toBe(0);
  });

  it('adds a bounded mastery bonus to earned knowledge points', () => {
    const answers = [
      { category: 'identity', correct: true, points: 1_000 },
      { category: 'stat', correct: false, points: 0 },
      { category: 'champion', correct: true, points: 500 },
    ] as const;

    expect(getKnowledgePoints(answers)).toBe(1_500);
    expect(getMasteryBonus(answers)).toBe(750);
    expect(calculateScore(answers)).toBe(2_250);
  });

  it('rewards quick answers with a volatile five-second half-life', () => {
    expect(getSpeedBonusPoints(1_000, 0)).toBe(3_000);
    expect(getSpeedBonusPoints(1_000, 2_000)).toBe(2_270);
    expect(getSpeedBonusPoints(1_000, 5_000)).toBe(1_500);
    expect(getSpeedBonusPoints(1_000, 8_000)).toBe(990);
    expect(getSpeedBonusPoints(1_000, 16_000)).toBe(330);
    expect(getSpeedBonusPoints(1_000, -1)).toBe(3_000);
    expect(getSpeedBonusPoints(0, 0)).toBe(0);
  });

  it('combines knowledge, speed, and mastery for a perfect round', () => {
    const perfect = Array.from({ length: 10 }, () => ({
      category: 'identity' as const,
      correct: true,
      points: 1_000,
      responseMilliseconds: 0,
      speedBonus: 3_000,
    }));

    expect(getSpeedBonus(perfect)).toBe(30_000);
    expect(calculateScore(perfect)).toBe(50_000);
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
