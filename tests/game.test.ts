import catalogData from '@/game/data/pokemon.json';
import { createSeededRandom } from '@/game/random';
import {
  buildQuestions,
  buildQuestionSequence,
  calculateScore,
  defaultModifiers,
  filterPokemon,
  formatDuration,
  getAnswerPoints,
  getCorrectOptions,
  getKnowledgePoints,
  getMasteryBonus,
  getQuestionCount,
  getQuestionPromptText,
  getQuestionTitle,
  getQuestionTypeLabel,
  getResponseTimeSeconds,
  getSpeedBonus,
  getSpeedBonusPoints,
  getTrainingModifiers,
  normalizeModifiers,
  shuffle,
} from '@/game/game';
import { formatPokedexNumber, formatPokemonName } from '@/game/format';
import {
  coreQuestionTypes,
  questionRegistry,
  questionTypes,
} from '@/game/questions/registry';
import { buildCounterPickQuestion } from '@/game/questions/battle';
import {
  pokemonOptions,
  pokemonSimilarity,
  redactName,
} from '@/game/questions/shared';
import {
  generations,
  type PokemonCatalog,
  type PokemonKnowledge,
  type QuestionType,
} from '@/game/types';

const catalog = catalogData as PokemonCatalog;

const makeKnowledge = (
  id: number,
  overrides: Partial<PokemonKnowledge> = {},
): PokemonKnowledge => ({
  abilities: [`ability-${id}`],
  color: 'red',
  description: `Entry ${id}`,
  evolvesFrom: null,
  evolvesTo: [],
  generation: 'I',
  genus: 'Test',
  id,
  identitySprites: {
    generations: [
      {
        back: ['red-blue'],
        front: ['red-blue'],
        generation: 'I',
      },
    ],
  },
  isLegendary: false,
  isMythical: false,
  levelMoves: [`move-${id}`],
  shape: 'quadruped',
  shinySprite: `/shiny/${id}.png`,
  sprite: `/sprite/${id}.png`,
  stats: {
    attack: 50,
    defense: 50,
    hp: 50,
    'special-attack': 50,
    'special-defense': 50,
    speed: 50,
  },
  types: ['fire'],
  ...overrides,
});

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

const buildSingleQuestion = (questionType: QuestionType, seed: string) =>
  buildQuestions(
    catalog,
    { ...defaultModifiers, questionTypes: [questionType] },
    createSeededRandom(seed),
    1,
  )[0];

describe('normalizeModifiers', () => {
  it('enables every generation by default', () => {
    expect(defaultModifiers.generations).toEqual(generations);
  });

  it('returns defaults for malformed storage', () => {
    expect(normalizeModifiers('broken')).toEqual(defaultModifiers);
  });

  it('keeps valid selections and discards unknown values', () => {
    expect(
      normalizeModifiers({
        generations: ['IX', 'not-a-generation'],
        questionTypes: ['stat-showdown', 'not-a-type'],
        speedrunMode: true,
      }),
    ).toEqual({
      answerFlow: 'instant',
      generations: ['IX'],
      questionTypes: ['stat-showdown'],
      reduceMotion: false,
      soundVolume: 1,
      timerDisplay: 'seconds',
      trainingMode: 'league',
    });
  });

  it('keeps an explicit Custom mode when every question type is selected', () => {
    expect(
      normalizeModifiers({
        ...defaultModifiers,
        trainingMode: 'custom',
      }).trainingMode,
    ).toBe('custom');
  });

  it('excludes advanced formats from League Training but preserves Custom choices', () => {
    expect(
      getTrainingModifiers({
        ...defaultModifiers,
        questionTypes: ['evolution-shift'],
      }),
    ).toMatchObject({
      questionTypes: coreQuestionTypes,
      trainingMode: 'league',
    });
    expect(coreQuestionTypes).toHaveLength(15);
    for (const advanced of ['ability-check', 'move-check', 'stat-showdown']) {
      expect(coreQuestionTypes).not.toContain(advanced);
    }
    expect(
      getTrainingModifiers({
        ...defaultModifiers,
        questionTypes: ['ability-check', 'move-check', 'stat-showdown'],
        trainingMode: 'custom',
      }),
    ).toMatchObject({
      questionTypes: ['ability-check', 'move-check', 'stat-showdown'],
      trainingMode: 'custom',
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
});

describe('question building', () => {
  it('keeps advanced formats out of generated League Training rounds', () => {
    const modifiers = getTrainingModifiers(defaultModifiers);
    for (let index = 0; index < 20; index += 1) {
      const questions = buildQuestions(
        catalog,
        modifiers,
        createSeededRandom(`core-training-${index}`),
      );
      expect(questions).toHaveLength(10);
      for (const question of questions) {
        expect(['ability-check', 'move-check', 'stat-showdown']).not.toContain(
          question.questionType,
        );
      }
    }
  });

  it('keeps every selectable format in one complete registry', () => {
    expect(Object.keys(questionRegistry)).toEqual(questionTypes);
    expect(
      questionTypes.every(
        (questionType) =>
          questionRegistry[questionType].category &&
          questionRegistry[questionType].description &&
          questionRegistry[questionType].group &&
          questionRegistry[questionType].label,
      ),
    ).toBe(true);
  });

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
      },
      createSeededRandom('all-categories'),
      questionTypes.length,
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

  it('fills a requested sequence when its preferred format is unavailable', () => {
    const syntheticCatalog: PokemonCatalog = {
      contentVersion: 1,
      pokemon: Object.fromEntries(
        [1, 2, 3, 4].map((id) => [
          `pokemon-${id}`,
          makeKnowledge(id, { description: '' }),
        ]),
      ),
      typeRelations: {
        fire: { doubleTo: [], halfTo: [], noneTo: [] },
      },
    };

    const questions = buildQuestionSequence(
      syntheticCatalog,
      ['field-notes'],
      { ...defaultModifiers, questionTypes: ['field-notes', 'pokedex-scan'] },
      createSeededRandom('sequence-fallback'),
    );

    expect(questions).toHaveLength(1);
    expect(questions[0]?.questionType).toBe('pokedex-scan');
  });

  it('starts the Champion question with a Pokédex clue before paid assists', () => {
    const [question] = buildQuestionSequence(
      catalog,
      ['champion'],
      defaultModifiers,
      createSeededRandom('champion-opening-clue'),
    );
    const target = question && catalog.pokemon[question.pokemonName];

    expect(question).toBeDefined();
    expect(target).toBeDefined();
    expect(getQuestionPromptText(question!.prompt)).toBe(
      `“${redactName(target!.description, question!.pokemonName)}”`,
    );
    expect(question!.clues).not.toContain(
      redactName(target!.description, question!.pokemonName),
    );
    expect(question!.media).toMatchObject({ kind: 'sprite', revealAt: 4 });
    expect(question!.searchOptions).toEqual(
      expect.arrayContaining([
        {
          dexNumber: target!.id,
          name: question!.pokemonName,
        },
      ]),
    );
  });

  it('keeps Pokémon distractors plausible but randomizes property distractors', () => {
    const similarNames = ['target', 'peer-one', 'peer-two', 'peer-three'];
    const syntheticCatalog: PokemonCatalog = {
      contentVersion: 1,
      pokemon: {
        target: makeKnowledge(1, { abilities: ['blaze'] }),
        'peer-one': makeKnowledge(2),
        'peer-two': makeKnowledge(3),
        'peer-three': makeKnowledge(4),
        'unrelated-one': makeKnowledge(100, {
          color: 'blue',
          generation: 'IX',
          shape: 'blob',
          types: ['water'],
        }),
        'unrelated-two': makeKnowledge(101, {
          color: 'black',
          generation: 'VIII',
          shape: 'wings',
          types: ['flying'],
        }),
        'unrelated-three': makeKnowledge(102, {
          color: 'white',
          generation: 'VII',
          shape: 'fish',
          types: ['ice'],
        }),
      },
      typeRelations: {
        fire: { doubleTo: [], halfTo: [], noneTo: [] },
        flying: { doubleTo: [], halfTo: [], noneTo: [] },
        ice: { doubleTo: [], halfTo: [], noneTo: [] },
        water: { doubleTo: [], halfTo: [], noneTo: [] },
      },
    };

    const expectedOptions = {
      'ability-check': ['blaze', 'ability-3', 'ability-4', 'ability-100'],
      'move-check': ['move-1', 'move-3', 'move-4', 'move-100'],
      'pokedex-scan': similarNames,
    } as const;

    for (const questionType of [
      'pokedex-scan',
      'ability-check',
      'move-check',
    ] as const) {
      const [question] = buildQuestions(
        syntheticCatalog,
        { ...defaultModifiers, questionTypes: [questionType] },
        () => 0,
        1,
      );
      expect(question?.pokemonName).toBe('target');
      expect(new Set(question?.options)).toEqual(
        new Set(expectedOptions[questionType]),
      );
    }
  });

  it('does not treat nearby Pokédex numbers as semantic similarity', () => {
    const target = makeKnowledge(500);

    expect(pokemonSimilarity(target, makeKnowledge(501))).toBe(
      pokemonSimilarity(target, makeKnowledge(1_000)),
    );
  });

  it('varies plausible Pokémon distractors and includes numerical spread', () => {
    const closeIds = Array.from({ length: 10 }, (_, index) => 501 + index);
    const distantIds = [900, 1_000, 1_100, 1_200, 1_300];
    const syntheticCatalog: PokemonCatalog = {
      contentVersion: 1,
      pokemon: {
        target: makeKnowledge(500),
        ...Object.fromEntries(
          [...closeIds, ...distantIds].map((id) => [
            `similar-${id}`,
            makeKnowledge(id),
          ]),
        ),
        ...Object.fromEntries(
          [1_400, 1_500, 1_600].map((id) => [
            `unrelated-${id}`,
            makeKnowledge(id, {
              color: 'blue',
              generation: 'IX',
              shape: 'fish',
              types: ['water'],
            }),
          ]),
        ),
      },
      typeRelations: {},
    };
    const pool = Object.entries(syntheticCatalog.pokemon).map(
      ([name, pokemon]) => ({ name, pokemon }),
    );
    const target = pool.find(({ name }) => name === 'target')!;
    const optionSets = Array.from({ length: 6 }, (_, index) =>
      pokemonOptions(
        {
          catalog: syntheticCatalog,
          pool,
          random: createSeededRandom(`distractor-spread-${index}`),
          used: new Set(),
        },
        target,
      ),
    );
    const distractors = optionSets.flatMap((options) =>
      options.filter((name) => name !== target.name),
    );

    expect(new Set(distractors).size).toBeGreaterThan(3);
    expect(distractors.every((name) => name.startsWith('similar-'))).toBe(true);
    for (const options of optionSets) {
      expect(options).toHaveLength(4);
      expect(options).toContain(target.name);
      expect(
        Math.max(
          ...options.map((name) =>
            Math.abs(syntheticCatalog.pokemon[name]!.id - target.pokemon.id),
          ),
        ),
      ).toBeGreaterThanOrEqual(400);
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
      },
      createSeededRandom('question-visuals'),
      8,
    );
    const byCategory = Object.fromEntries(
      questions.map((question) => [question.category, question]),
    );

    for (const question of questions) {
      expect(question.pokemonTypes).toEqual(
        catalog.pokemon[question.pokemonName]?.types,
      );
    }

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

  it('numbers Pokémon choices except formats where numbers expose the answer', () => {
    for (const questionType of questionTypes) {
      const question = buildSingleQuestion(
        questionType,
        `numbered-${questionType}`,
      );

      expect(question).toBeDefined();
      for (const option of question!.options) {
        const pokemon = catalog.pokemon[option];
        if (
          questionType === 'evolution-link' ||
          questionType === 'generation-roundup'
        ) {
          expect(question!.optionDexNumbers).toBeUndefined();
        } else if (pokemon) {
          expect(question!.optionDexNumbers?.[option]).toBe(pokemon.id);
        }
      }
    }
  });

  it('builds an exact multi-select answer key', () => {
    const multiSelect = buildSingleQuestion('type-roundup', 'multi-select');
    expect(multiSelect?.answer.correctOptions.length).toBeGreaterThan(1);
    expect(multiSelect?.options).toHaveLength(4);
    expect(multiSelect?.visual).toMatchObject({ kind: 'type-roundup' });
  });

  it('builds both Stat Showdown directions with a unique extreme answer', () => {
    const questions = Array.from(
      { length: 40 },
      (_, index) =>
        buildQuestions(
          catalog,
          { ...defaultModifiers, questionTypes: ['stat-showdown'] },
          createSeededRandom(`stat-direction-${index}`),
          1,
        )[0],
    ).filter((candidate) => candidate !== undefined);
    const directions = new Set(
      questions.map((candidate) =>
        candidate.visual?.kind === 'stat-showdown'
          ? candidate.visual.direction
          : undefined,
      ),
    );

    expect(directions).toEqual(new Set(['highest', 'lowest']));
    for (const candidate of questions) {
      expect(candidate.visual?.kind).toBe('stat-showdown');
      if (candidate.visual?.kind !== 'stat-showdown') continue;
      const stat = candidate.visual.stat;
      const correct = getCorrectOptions(candidate)[0]!;
      const correctValue = catalog.pokemon[correct]!.stats[stat];
      const distractorValues = candidate.options
        .filter((option) => option !== correct)
        .map((option) => catalog.pokemon[option]!.stats[stat]);

      for (const option of candidate.options) {
        expect(candidate.optionStats?.[option]).toBe(
          catalog.pokemon[option]!.stats[stat],
        );
      }
      expect(getQuestionPromptText(candidate.prompt)).not.toContain('base');
      if (candidate.visual.direction === 'highest') {
        expect(distractorValues.every((value) => value < correctValue)).toBe(
          true,
        );
      } else {
        expect(distractorValues.every((value) => value > correctValue)).toBe(
          true,
        );
      }
    }
  });

  it('uses exact quarter-, half-, double-, and quadruple-damage matchups', () => {
    for (const questionType of ['type-matchup', 'counter-pick'] as const) {
      const questions = Array.from({ length: 24 }, (_, index) =>
        buildSingleQuestion(questionType, `${questionType}-${index}`),
      ).filter((question) => question !== undefined);
      const multipliers = new Set(
        questions.flatMap((question) =>
          question.visual?.kind === 'type-matchup' ||
          question.visual?.kind === 'counter-pick'
            ? [question.visual.multiplier]
            : [],
        ),
      );

      expect(multipliers).toEqual(new Set([0.25, 0.5, 2, 4]));
      for (const question of questions) {
        const defender = catalog.pokemon[question.pokemonName]!;
        const correct = getCorrectOptions(question)[0]!;
        const visual = question.visual;
        expect(['type-matchup', 'counter-pick']).toContain(visual?.kind);
        if (
          visual?.kind !== 'type-matchup' &&
          visual?.kind !== 'counter-pick'
        ) {
          continue;
        }
        const multiplier = visual.multiplier;

        if (questionType === 'type-matchup') {
          expect(attackMultiplier(correct, defender.types)).toBe(multiplier);
        } else {
          expect(
            Math.max(
              ...catalog.pokemon[correct]!.types.map((type) =>
                attackMultiplier(type, defender.types),
              ),
            ),
          ).toBe(multiplier);
        }
      }
    }
  });

  it('builds Counter Pick with exactly one matching answer', () => {
    const question = buildSingleQuestion('counter-pick', 'counter-pick');
    expect(question?.title).toBe('Counter pick');
    expect(question?.media.kind).toBe('pixel-sprite');
    expect(Object.keys(question?.optionVisuals ?? {})).toHaveLength(4);
    expect(question?.visual?.kind).toBe('counter-pick');

    const defender = catalog.pokemon[question!.pokemonName]!;
    const correct = getCorrectOptions(question!)[0];
    const multiplier =
      question?.visual?.kind === 'counter-pick'
        ? question.visual.multiplier
        : undefined;
    for (const option of question!.options) {
      const attacker = catalog.pokemon[option]!;
      const strongestMatchup = Math.max(
        ...attacker.types.map((type) => attackMultiplier(type, defender.types)),
      );
      expect(strongestMatchup === multiplier).toBe(option === correct);
    }
  });

  it('treats Venusaur as a ×4 attacker against Golem, never ×¼', () => {
    const matchups: Record<string, number> = {
      venusaur: 4,
      exeggcute: 4,
      arbok: 0.25,
      jolteon: 0,
      arcanine: 0.5,
    };
    const pool = ['golem', ...Object.keys(matchups)].map((name) => ({
      name,
      pokemon: catalog.pokemon[name]!,
    }));
    const observed = new Set<number>();
    let venusaurCorrect = false;
    for (let index = 0; index < 64; index += 1) {
      const question = buildCounterPickQuestion({
        catalog,
        pool,
        random: createSeededRandom(`golem-counter-${index}`),
        used: new Set(Object.keys(matchups)),
      });
      if (
        question?.pokemonName !== 'golem' ||
        question.visual?.kind !== 'counter-pick'
      )
        continue;
      const { multiplier } = question.visual;
      const correct = question.answer.correctOptions[0];
      observed.add(multiplier);
      for (const option of question.options) {
        expect(
          matchups[option] === multiplier,
          `${option} against Golem at ×${multiplier}`,
        ).toBe(option === correct);
      }
      if (correct === 'venusaur') {
        venusaurCorrect = true;
        expect(multiplier).toBe(4);
      }
    }
    expect(observed).toEqual(new Set([4, 0.5, 0.25]));
    expect(venusaurCorrect).toBe(true);
  });

  it('builds Evolution Shift from a real typing change', () => {
    const question = buildSingleQuestion('evolution-shift', 'evolution-shift');
    expect(question?.title).toBe('Evolution shift');
    expect(question?.media.kind).toBe('pixel-sprite');

    const target = catalog.pokemon[question!.pokemonName]!;
    const evolution = catalog.pokemon[target.evolvesTo[0]!]!;
    const correct = getCorrectOptions(question!)[0]!;
    expect(target.types).not.toContain(correct);
    expect(evolution.types).toContain(correct);
    expect(question?.visual).toEqual({
      evolution: {
        dexNumber: evolution.id,
        name: target.evolvesTo[0],
        src: evolution.sprite,
        types: evolution.types,
      },
      gainedType: correct,
      kind: 'evolution-shift',
    });
  });

  it('uses only versioned front and back sprites for Pokédex Scan', () => {
    const sources = new Set(
      Array.from({ length: 80 }, (_, index) => {
        const question = buildSingleQuestion(
          'pokedex-scan',
          `pokedex-scan-${index}`,
        );
        expect(getQuestionPromptText(question!.prompt)).toBe(
          'Who is this Pokémon?',
        );
        return question?.media.kind === 'sprite' ? question.media.src : '';
      }),
    );

    expect(
      [...sources].some(
        (source) => source.includes('/versions/') && !source.includes('/back/'),
      ),
    ).toBe(true);
    expect(
      [...sources].some(
        (source) => source.includes('/versions/') && source.includes('/back/'),
      ),
    ).toBe(true);
    expect([...sources].every((source) => source.includes('/versions/'))).toBe(
      true,
    );
    expect([...sources].every((source) => !source.includes('/other/'))).toBe(
      true,
    );
  });
});

describe('scoring', () => {
  it('awards 1,000 points for a normal correct answer', () => {
    const question = buildSingleQuestion('stat-showdown', 'score');
    expect(question && getAnswerPoints(question, true)).toBe(1_000);
    expect(question && getAnswerPoints(question, false)).toBe(0);
  });

  it('reduces Champion points as answer assistance is revealed', () => {
    const [question] = buildQuestionSequence(
      catalog,
      ['champion'],
      defaultModifiers,
      createSeededRandom('champion-score'),
    );

    expect(question && getAnswerPoints(question, true, 0)).toBe(1_000);
    expect(question && getAnswerPoints(question, true, 1)).toBe(750);
    expect(question && getAnswerPoints(question, true, 2)).toBe(500);
    expect(question && getAnswerPoints(question, true, 3)).toBe(250);
    expect(question && getAnswerPoints(question, true, 8)).toBe(250);
  });

  it('adds a bounded mastery bonus to earned knowledge points', () => {
    const answers = [
      {
        category: 'identity',
        cluesUsed: 0,
        correct: true,
        generation: 'I',
        pokemonName: 'pikachu',
        points: 1_000,
        questionType: 'pokedex-scan',
      },
      {
        category: 'stat',
        cluesUsed: 0,
        correct: false,
        generation: 'II',
        pokemonName: 'sudowoodo',
        points: 0,
        questionType: 'stat-showdown',
      },
      {
        category: 'champion',
        cluesUsed: 2,
        correct: true,
        generation: 'III',
        pokemonName: 'rayquaza',
        points: 500,
        questionType: 'champion',
      },
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
      cluesUsed: 0,
      correct: true,
      generation: 'I' as const,
      pokemonName: 'pikachu',
      points: 1_000,
      questionType: 'pokedex-scan' as const,
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
    expect(getQuestionCount(4, 100)).toBe(4);
    const input = [1, 2, 3];
    expect(shuffle(input, () => 0)).toEqual([2, 3, 1]);
    expect(input).toEqual([1, 2, 3]);
  });

  it('formats durations and API names', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatPokemonName('special-attack')).toBe('Special Attack');
    expect(formatPokedexNumber(25)).toBe('No. 0025');
  });

  it('totals only active answer time', () => {
    expect(
      getResponseTimeSeconds([
        {
          category: 'identity',
          cluesUsed: 0,
          correct: true,
          generation: 'I',
          pokemonName: 'pikachu',
          points: 1_000,
          questionType: 'pokedex-scan',
          responseMilliseconds: 1_900,
        },
        {
          category: 'type',
          cluesUsed: 0,
          correct: false,
          generation: 'II',
          pokemonName: 'sudowoodo',
          points: 0,
          questionType: 'type-check',
          responseMilliseconds: 2_600,
        },
      ]),
    ).toBe(4);
  });
});
