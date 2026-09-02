import {
  generations,
  questionTypeDefinitions,
  questionTypes,
  statNames,
  type AnswerResult,
  type Generation,
  type Modifiers,
  type PokemonOptionVisual,
  type PokemonCatalog,
  type PokemonKnowledge,
  type QuestionCategory,
  type QuestionData,
  type QuestionPrompt,
  type QuestionType,
  type StatName,
} from './types';

export const defaultModifiers: Modifiers = {
  generations: [...generations],
  questionTypes: [...questionTypes],
  soundEnabled: true,
  isLimitActive: true,
  limit: 10,
  speedrunMode: false,
};

const categoryLabels: Record<QuestionCategory, string> = {
  ability: 'Ability check',
  champion: 'Champion question',
  description: 'Field notes',
  evolution: 'Evolution trail',
  identity: 'Pokédex scan',
  matchup: 'Type matchup',
  move: 'Move check',
  stat: 'Stat showdown',
  type: 'Type check',
};

const pokemonOptionCategories: readonly QuestionCategory[] = [
  'description',
  'evolution',
  'stat',
];

const targetSpriteCategories: readonly QuestionCategory[] = [
  'type',
  'ability',
  'move',
  'matchup',
];

const isGeneration = (value: unknown): value is Generation =>
  typeof value === 'string' && generations.includes(value as Generation);

const isQuestionType = (value: unknown): value is QuestionType =>
  typeof value === 'string' && questionTypes.includes(value as QuestionType);

const legacyKnowledgeCategories = [
  'identity',
  'description',
  'type',
  'evolution',
  'ability',
  'move',
  'stat',
  'matchup',
] as const;

const newlyAddedQuestionTypes: readonly QuestionType[] = [
  'battle-view',
  'evolution-shift',
  'counter-pick',
];

type LegacyKnowledgeCategory = (typeof legacyKnowledgeCategories)[number];

const isLegacyKnowledgeCategory = (
  value: unknown,
): value is LegacyKnowledgeCategory =>
  typeof value === 'string' &&
  legacyKnowledgeCategories.includes(value as LegacyKnowledgeCategory);

type StoredModifiers = Partial<Modifiers> & {
  knowledgeCategories?: unknown;
};

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as StoredModifiers;
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter(isGeneration)
    : [];
  const selectedQuestionTypes = Array.isArray(candidate.questionTypes)
    ? candidate.questionTypes.filter(isQuestionType)
    : [];
  const previousQuestionTypes = questionTypes.filter(
    (questionType) => !newlyAddedQuestionTypes.includes(questionType),
  );
  const hadEveryPreviousQuestionType = previousQuestionTypes.every(
    (questionType) => selectedQuestionTypes.includes(questionType),
  );
  const legacyCategories = Array.isArray(candidate.knowledgeCategories)
    ? candidate.knowledgeCategories.filter(isLegacyKnowledgeCategory)
    : [];
  const migratedQuestionTypes = questionTypes.filter((questionType) =>
    legacyCategories.includes(questionTypeDefinitions[questionType].category),
  );
  const limit = Number.isFinite(candidate.limit)
    ? Math.max(1, Math.trunc(candidate.limit as number))
    : defaultModifiers.limit;

  return {
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    questionTypes:
      selectedQuestionTypes.length > 0
        ? hadEveryPreviousQuestionType
          ? [...questionTypes]
          : selectedQuestionTypes
        : migratedQuestionTypes.length > 0
          ? migratedQuestionTypes
          : defaultModifiers.questionTypes,
    soundEnabled: candidate.soundEnabled !== false,
    isLimitActive: candidate.isLimitActive !== false,
    limit,
    speedrunMode: candidate.speedrunMode === true,
  };
};

export const filterPokemon = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
): string[] =>
  Object.entries(catalog.pokemon)
    .filter(([, pokemon]) => modifiers.generations.includes(pokemon.generation))
    .map(([name]) => name);

export const shuffle = <T>(
  values: readonly T[],
  random: () => number = Math.random,
): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target] as T,
      shuffled[index] as T,
    ];
  }

  return shuffled;
};

export const getQuestionCount = (
  availableCount: number,
  modifiers: Modifiers,
): number => {
  if (availableCount < 1) return 0;
  if (!modifiers.isLimitActive) return availableCount;
  return Math.min(Math.max(1, modifiers.limit), availableCount);
};

interface Candidate {
  name: string;
  pokemon: PokemonKnowledge;
}

interface QuestionContext {
  catalog: PokemonCatalog;
  pool: Candidate[];
  random: () => number;
  used: Set<string>;
}

const pick = <T>(values: readonly T[], random: () => number): T | undefined =>
  values[Math.floor(random() * values.length)];

const pickTarget = (
  context: QuestionContext,
  predicate: (pokemon: PokemonKnowledge) => boolean,
): Candidate | undefined => {
  const eligible = context.pool.filter(({ pokemon }) => predicate(pokemon));
  const fresh = eligible.filter(({ name }) => !context.used.has(name));
  const target = pick(fresh.length > 0 ? fresh : eligible, context.random);
  if (target) context.used.add(target.name);
  return target;
};

const optionSet = (
  correct: string,
  candidates: readonly string[],
  random: () => number,
): string[] => {
  const unique = [...new Set(candidates)].filter(
    (candidate) => candidate !== correct,
  );
  return shuffle([...shuffle(unique, random).slice(0, 3), correct], random);
};

const makeQuestion = (
  category: QuestionCategory,
  target: Candidate,
  correctOption: string,
  options: string[],
  prompt: QuestionPrompt,
  media: QuestionData['media'] = { kind: 'none' },
): QuestionData => ({
  answer: {
    correctOptions: [correctOption],
    interaction: 'single-choice',
  },
  category,
  id: `${category}:${target.name}`,
  media,
  options,
  pokemonName: target.name,
  prompt,
});

const textPrompt = (text: string): QuestionPrompt => ({ kind: 'text', text });

const pokemonPrompt = (
  target: Candidate,
  before: string,
  after: string,
): QuestionPrompt => ({
  after,
  before,
  dexNumber: target.pokemon.id,
  kind: 'pokemon',
  name: target.name,
});

const getOptionVisuals = (
  context: QuestionContext,
  options: readonly string[],
  getSource: (pokemon: PokemonKnowledge, option: string) => string | null = (
    pokemon,
  ) => pokemon.sprite,
  silhouette = false,
): Record<string, PokemonOptionVisual> =>
  Object.fromEntries(
    options.flatMap((option) => {
      const pokemon = context.catalog.pokemon[option];
      const src = pokemon ? getSource(pokemon, option) : null;
      return pokemon && src
        ? [[option, { dexNumber: pokemon.id, silhouette, src }] as const]
        : [];
    }),
  );

const addQuestionVisuals = (
  context: QuestionContext,
  question: QuestionData,
): QuestionData => {
  if (question.optionVisuals) return question;
  if (question.media.kind !== 'none') return question;

  if (pokemonOptionCategories.includes(question.category)) {
    const optionVisuals = getOptionVisuals(context, question.options);
    return { ...question, optionVisuals };
  }

  if (targetSpriteCategories.includes(question.category)) {
    const target = context.catalog.pokemon[question.pokemonName];
    if (target?.sprite) {
      return {
        ...question,
        media: { kind: 'pixel-sprite', src: target.sprite },
      };
    }
  }

  return question;
};

const pokemonOptions = (
  context: QuestionContext,
  target: Candidate,
  excluded: readonly string[] = [],
) =>
  optionSet(
    target.name,
    context.pool
      .filter(({ name }) => name !== target.name && !excluded.includes(name))
      .map(({ name }) => name),
    context.random,
  );

const buildIdentityQuestion = (
  context: QuestionContext,
  silhouette: boolean,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;
  return makeQuestion(
    'identity',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt(
      silhouette ? 'Who is hiding in this silhouette?' : 'Who is this Pokémon?',
    ),
    { kind: 'sprite', silhouette, src: target.pokemon.sprite },
  );
};

const buildSilhouetteMatchQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target) return undefined;
  const options = pokemonOptions(context, target).filter(
    (option) => context.catalog.pokemon[option]?.sprite,
  );
  if (options.length !== 4) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      options,
      pokemonPrompt(target, 'Which silhouette belongs to ', '?'),
    ),
    concealOptionLabels: true,
    optionVisuals: getOptionVisuals(context, options, undefined, true),
    title: 'Silhouette match',
  };
};

const buildPixelPeekQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ sprite }) => Boolean(sprite));
  if (!target?.pokemon.sprite) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Who is hiding in this pixel peek?'),
      {
        focusX: pick([25, 50, 75], context.random) ?? 50,
        focusY: pick([25, 50, 75], context.random) ?? 50,
        kind: 'pixel-peek',
        src: target.pokemon.sprite,
      },
    ),
    title: 'Pixel peek',
  };
};

const buildShinySpotterQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ shinySprite, sprite }) =>
    Boolean(shinySprite && sprite),
  );
  if (!target?.pokemon.shinySprite) return undefined;
  const eligible = context.pool
    .filter(({ pokemon }) => pokemon.sprite && pokemon.shinySprite)
    .map(({ name }) => name);
  const options = optionSet(target.name, eligible, context.random);
  if (options.length !== 4) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      options,
      textPrompt('Which Pokémon is shown in its shiny colors?'),
    ),
    explanation: `${formatPokemonName(target.name)} is the shiny one.`,
    optionVisuals: getOptionVisuals(context, options, (pokemon, option) =>
      option === target.name ? pokemon.shinySprite : pokemon.sprite,
    ),
    title: 'Shiny spotter',
  };
};

const buildBattleViewQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ backSprite }) => Boolean(backSprite));
  if (!target?.pokemon.backSprite) return undefined;

  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Who is this Pokémon from behind?'),
      {
        kind: 'sprite',
        silhouette: false,
        src: target.pokemon.backSprite,
      },
    ),
    title: 'Battle view',
  };
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const redactName = (description: string, name: string): string => {
  const forms = [name, name.replaceAll('-', ' ')].map(escapeRegExp);
  return description.replace(new RegExp(forms.join('|'), 'gi'), 'This Pokémon');
};

const buildDescriptionQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ description }) => Boolean(description));
  if (!target) return undefined;
  return makeQuestion(
    'description',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt(`“${redactName(target.pokemon.description, target.name)}”`),
  );
};

const buildTypeQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ types }) => types.length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon.types, context.random);
  if (!correct) return undefined;
  const candidates = Object.keys(context.catalog.typeRelations).filter(
    (type) => !target.pokemon.types.includes(type),
  );
  return makeQuestion(
    'type',
    target,
    correct,
    optionSet(correct, candidates, context.random),
    pokemonPrompt(target, 'Which type does ', ' have?'),
  );
};

const getTypePuzzlePool = (
  context: QuestionContext,
  type: string,
): { matching: Candidate[]; others: Candidate[] } => ({
  matching: context.pool.filter(
    ({ pokemon }) => pokemon.sprite && pokemon.types.includes(type),
  ),
  others: context.pool.filter(
    ({ pokemon }) => pokemon.sprite && !pokemon.types.includes(type),
  ),
});

const buildOddOneOutQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const type = pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random).filter(
      (candidate) => {
        const { matching, others } = getTypePuzzlePool(context, candidate);
        return matching.length >= 3 && others.length > 0;
      },
    ),
    context.random,
  );
  if (!type) return undefined;
  const { matching, others } = getTypePuzzlePool(context, type);
  const shared = shuffle(matching, context.random).slice(0, 3);
  const freshOthers = others.filter(({ name }) => !context.used.has(name));
  const target = pick(
    freshOthers.length > 0 ? freshOthers : others,
    context.random,
  );
  if (!target) return undefined;
  context.used.add(target.name);
  const options = shuffle(
    [...shared.map(({ name }) => name), target.name],
    context.random,
  );

  return {
    ...makeQuestion(
      'type',
      target,
      target.name,
      options,
      textPrompt('Which Pokémon does not belong?'),
    ),
    explanation: `The other three are ${formatPokemonName(type)}-type Pokémon.`,
    optionVisuals: getOptionVisuals(context, options),
    title: 'Odd one out',
  };
};

const buildChooseAllTypeQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const type = pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random).filter(
      (candidate) => {
        const { matching, others } = getTypePuzzlePool(context, candidate);
        return (
          matching.length >= correctCount && others.length >= 4 - correctCount
        );
      },
    ),
    context.random,
  );
  if (!type) return undefined;
  const { matching, others } = getTypePuzzlePool(context, type);
  const selectedMatching = shuffle(matching, context.random).slice(
    0,
    correctCount,
  );
  const selectedOthers = shuffle(others, context.random).slice(
    0,
    4 - correctCount,
  );
  const target = selectedMatching[0];
  if (!target) return undefined;
  context.used.add(target.name);
  const correctOptions = selectedMatching.map(({ name }) => name);
  const options = shuffle(
    [...correctOptions, ...selectedOthers.map(({ name }) => name)],
    context.random,
  );

  return {
    ...makeQuestion(
      'type',
      target,
      correctOptions[0] ?? target.name,
      options,
      textPrompt(`Select every ${formatPokemonName(type)}-type Pokémon.`),
    ),
    answer: { correctOptions, interaction: 'multi-select' },
    explanation: `${correctOptions.map(formatPokemonName).join(' and ')} ${correctOptions.length === 1 ? 'is' : 'are'} ${formatPokemonName(type)} type.`,
    optionVisuals: getOptionVisuals(context, options),
    title: 'Type roundup',
  };
};

const buildEvolutionQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ evolvesTo }) => evolvesTo.length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon.evolvesTo, context.random);
  if (!correct) return undefined;
  const excluded = [target.name, ...target.pokemon.evolvesTo];
  return makeQuestion(
    'evolution',
    target,
    correct,
    optionSet(
      correct,
      context.pool
        .map(({ name }) => name)
        .filter((name) => !excluded.includes(name)),
      context.random,
    ),
    pokemonPrompt(target, 'Which Pokémon can ', ' evolve into?'),
  );
};

const buildEvolutionShiftQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const target = pickTarget(context, ({ evolvesTo, types }) => {
    if (evolvesTo.length !== 1) return false;
    const evolutionName = evolvesTo[0];
    const evolution = evolutionName
      ? context.catalog.pokemon[evolutionName]
      : undefined;
    return Boolean(
      evolutionName &&
      poolNames.has(evolutionName) &&
      evolution?.sprite &&
      evolution.types.filter((type) => !types.includes(type)).length === 1,
    );
  });
  if (!target?.pokemon.sprite) return undefined;
  const evolutionName = target.pokemon.evolvesTo[0];
  const evolution = evolutionName
    ? context.catalog.pokemon[evolutionName]
    : undefined;
  const correct = evolution?.types.find(
    (type) => !target.pokemon.types.includes(type),
  );
  if (!correct || !evolutionName) return undefined;

  return {
    ...makeQuestion(
      'evolution',
      target,
      correct,
      optionSet(
        correct,
        Object.keys(context.catalog.typeRelations),
        context.random,
      ),
      pokemonPrompt(target, 'Which type can ', ' gain after evolving?'),
      { kind: 'pixel-sprite', src: target.pokemon.sprite },
    ),
    explanation: `${formatPokemonName(target.name)} gains the ${formatPokemonName(correct)} type when it evolves into ${formatPokemonName(evolutionName)}.`,
    title: 'Evolution shift',
  };
};

const buildPropertyQuestion = (
  context: QuestionContext,
  category: 'ability' | 'move',
): QuestionData | undefined => {
  const property = category === 'ability' ? 'abilities' : 'levelMoves';
  const target = pickTarget(context, (pokemon) => pokemon[property].length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon[property], context.random);
  if (!correct) return undefined;
  const candidates = context.pool.flatMap(({ pokemon }) => pokemon[property]);
  const invalid = new Set(target.pokemon[property]);
  const options = optionSet(
    correct,
    candidates.filter((candidate) => !invalid.has(candidate)),
    context.random,
  );
  const subject = category === 'ability' ? 'ability' : 'move by leveling up';
  return makeQuestion(
    category,
    target,
    correct,
    options,
    pokemonPrompt(target, `Which ${subject} can `, ' have?'),
  );
};

const buildStatQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const stat = pick(statNames, context.random) as StatName;
  const candidates = shuffle(context.pool, context.random);
  const target = candidates.find(({ pokemon }) => {
    const lower = candidates.filter(
      ({ pokemon: other }) => other.stats[stat] < pokemon.stats[stat],
    );
    return lower.length >= 3;
  });
  if (!target) return undefined;
  context.used.add(target.name);
  const distractors = candidates
    .filter(
      ({ name, pokemon }) =>
        name !== target.name &&
        pokemon.stats[stat] < target.pokemon.stats[stat],
    )
    .map(({ name }) => name);
  return makeQuestion(
    'stat',
    target,
    target.name,
    optionSet(target.name, distractors, context.random),
    textPrompt(
      `Which Pokémon has the highest base ${formatPokemonName(stat)}?`,
    ),
  );
};

const attackMultiplier = (
  catalog: PokemonCatalog,
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

const hasTypeAdvantage = (
  catalog: PokemonCatalog,
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
): boolean =>
  attackerTypes.some(
    (type) => attackMultiplier(catalog, type, defenderTypes) > 1,
  );

const buildMatchupQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const attackTypes = Object.keys(context.catalog.typeRelations);
  const target = pickTarget(context, ({ types }) =>
    attackTypes.some(
      (type) => attackMultiplier(context.catalog, type, types) > 1,
    ),
  );
  if (!target) return undefined;
  const strong = attackTypes.filter(
    (type) => attackMultiplier(context.catalog, type, target.pokemon.types) > 1,
  );
  const correct = pick(strong, context.random);
  if (!correct) return undefined;
  const distractors = attackTypes.filter(
    (type) =>
      type !== correct &&
      attackMultiplier(context.catalog, type, target.pokemon.types) <= 1,
  );
  return makeQuestion(
    'matchup',
    target,
    correct,
    optionSet(correct, distractors, context.random),
    pokemonPrompt(target, 'Which type is super effective against ', '?'),
  );
};

const buildCounterPickQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const fresh = context.pool.filter(({ name }) => !context.used.has(name));
  const repeated = context.pool.filter(({ name }) => context.used.has(name));
  const targets = [
    ...shuffle(fresh, context.random),
    ...shuffle(repeated, context.random),
  ];

  for (const target of targets) {
    if (!target.pokemon.sprite) continue;
    const candidates = context.pool.filter(
      ({ name, pokemon }) => name !== target.name && Boolean(pokemon.sprite),
    );
    const counters = candidates.filter(({ pokemon }) =>
      hasTypeAdvantage(context.catalog, pokemon.types, target.pokemon.types),
    );
    const distractors = candidates.filter(
      ({ pokemon }) =>
        !hasTypeAdvantage(context.catalog, pokemon.types, target.pokemon.types),
    );
    if (counters.length === 0 || distractors.length < 3) continue;
    const correct = pick(counters, context.random);
    if (!correct) continue;
    const options = optionSet(
      correct.name,
      distractors.map(({ name }) => name),
      context.random,
    );
    context.used.add(target.name);

    return {
      ...makeQuestion(
        'matchup',
        target,
        correct.name,
        options,
        pokemonPrompt(target, 'Who can hit ', ' super effectively?'),
      ),
      explanation: `${formatPokemonName(correct.name)} has a type that is super effective against ${formatPokemonName(target.name)}.`,
      optionVisuals: getOptionVisuals(context, options),
      title: 'Counter pick',
    };
  }

  return undefined;
};

const buildChampionQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const target = pickTarget(context, ({ description, genus, sprite, types }) =>
    Boolean(description && genus && sprite && types.length > 0),
  );
  if (!target?.pokemon.sprite) return undefined;
  return {
    ...makeQuestion(
      'champion',
      target,
      target.name,
      pokemonOptions(context, target),
      textPrompt('Name the Pokémon. Reveal fewer clues to earn more points.'),
      {
        kind: 'sprite',
        revealAt: 4,
        silhouette: true,
        src: target.pokemon.sprite,
      },
    ),
    clues: [
      redactName(target.pokemon.description, target.name),
      `Known as the ${target.pokemon.genus} Pokémon.`,
      `${target.pokemon.types.map(formatPokemonName).join(' / ')} type, introduced in Generation ${target.pokemon.generation}.`,
      `National Pokédex number #${target.pokemon.id}.`,
    ],
  };
};

const buildQuestionType = (
  context: QuestionContext,
  questionType: QuestionType | 'champion',
): QuestionData | undefined => {
  let question: QuestionData | undefined;

  switch (questionType) {
    case 'pokedex-scan':
      question = buildIdentityQuestion(context, false);
      break;
    case 'silhouette-match':
      question = buildSilhouetteMatchQuestion(context);
      break;
    case 'pixel-peek':
      question = buildPixelPeekQuestion(context);
      break;
    case 'shiny-spotter':
      question = buildShinySpotterQuestion(context);
      break;
    case 'battle-view':
      question = buildBattleViewQuestion(context);
      break;
    case 'field-notes':
      question = buildDescriptionQuestion(context);
      break;
    case 'type-check':
      question = buildTypeQuestion(context);
      break;
    case 'odd-one-out':
      question = buildOddOneOutQuestion(context);
      break;
    case 'type-roundup':
      question = buildChooseAllTypeQuestion(context);
      break;
    case 'evolution-trail':
      question = buildEvolutionQuestion(context);
      break;
    case 'evolution-shift':
      question = buildEvolutionShiftQuestion(context);
      break;
    case 'ability-check':
      question = buildPropertyQuestion(context, 'ability');
      break;
    case 'move-check':
      question = buildPropertyQuestion(context, 'move');
      break;
    case 'stat-showdown':
      question = buildStatQuestion(context);
      break;
    case 'type-matchup':
      question = buildMatchupQuestion(context);
      break;
    case 'counter-pick':
      question = buildCounterPickQuestion(context);
      break;
    case 'champion':
      question = buildChampionQuestion(context);
      break;
  }

  return question ? addQuestionVisuals(context, question) : undefined;
};

export const buildQuestions = (
  catalog: PokemonCatalog,
  modifiers: Modifiers,
  random: () => number = Math.random,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const count = getQuestionCount(pool.length, modifiers);
  const context: QuestionContext = { catalog, pool, random, used: new Set() };
  const questionTypeDeck = shuffle(modifiers.questionTypes, random);
  const questions: QuestionData[] = [];

  for (let index = 0; index < count; index += 1) {
    const selectedType = questionTypeDeck[index % questionTypeDeck.length];
    if (!selectedType) break;
    const candidates = [
      selectedType,
      ...shuffle(
        questionTypeDeck.filter(
          (questionType) => questionType !== selectedType,
        ),
        random,
      ),
    ];
    let question: QuestionData | undefined;
    for (const questionType of candidates) {
      question = buildQuestionType(context, questionType);
      if (question) break;
    }
    if (!question) continue;
    questions.push({ ...question, id: `${question.id}:${index}` });
  }

  return questions;
};

export const buildQuestionSequence = (
  catalog: PokemonCatalog,
  questionSequence: readonly (QuestionType | 'champion')[],
  modifiers: Modifiers,
  random: () => number,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const context: QuestionContext = { catalog, pool, random, used: new Set() };

  return questionSequence.flatMap((questionType, index) => {
    const question = buildQuestionType(context, questionType);
    return question ? [{ ...question, id: `${question.id}:${index}` }] : [];
  });
};

export const getAnswerPoints = (
  question: QuestionData,
  correct: boolean,
  cluesShown = 1,
): number => {
  if (!correct) return 0;
  if (question.category !== 'champion') return 1_000;
  return (
    [1_000, 750, 500, 250][Math.max(0, Math.min(3, cluesShown - 1))] ?? 250
  );
};

export const getKnowledgePoints = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + answer.points, 0);

const speedBonusRate = 3;
const speedBonusHalfLifeMilliseconds = 5_000;

export const getSpeedBonusPoints = (
  knowledgePoints: number,
  responseMilliseconds: number,
): number => {
  if (knowledgePoints <= 0) return 0;
  const elapsedMilliseconds = Math.max(0, responseMilliseconds);
  const bonus =
    knowledgePoints *
    speedBonusRate *
    2 ** (-elapsedMilliseconds / speedBonusHalfLifeMilliseconds);
  return Math.round(bonus / 10) * 10;
};

export const getSpeedBonus = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + (answer.speedBonus ?? 0), 0);

export const getMasteryBonus = (answers: readonly AnswerResult[]): number => {
  if (answers.length === 0) return 0;
  const knowledgePoints = getKnowledgePoints(answers);
  return Math.round(
    (knowledgePoints * knowledgePoints) / (answers.length * 1_000),
  );
};

export const SCORE_VERSION = 2;

export const calculateScore = (answers: readonly AnswerResult[]): number =>
  getKnowledgePoints(answers) +
  getSpeedBonus(answers) +
  getMasteryBonus(answers);

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];

export const getQuestionTypeLabel = (questionType: QuestionType): string =>
  questionTypeDefinitions[questionType].label;

export const getCorrectOptions = (question: QuestionData): string[] =>
  question.answer.correctOptions;

export const isQuestionAnswerCorrect = (
  question: QuestionData,
  selectedOptions: readonly string[],
): boolean => {
  const selected = new Set(selectedOptions);
  return (
    selected.size === question.answer.correctOptions.length &&
    question.answer.correctOptions.every((option) => selected.has(option))
  );
};

export const getQuestionTitle = (question: QuestionData): string =>
  question.title ?? getCategoryLabel(question.category);

export const getQuestionPromptText = (prompt: QuestionPrompt): string =>
  prompt.kind === 'text'
    ? prompt.text
    : `${prompt.before}${formatPokemonName(prompt.name)}${prompt.after}`;

export const formatDuration = (elapsedSeconds: number): string => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

export const formatPokemonName = (name: string): string =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
