import {
  generations,
  knowledgeCategories,
  statNames,
  type AnswerResult,
  type Generation,
  type KnowledgeCategory,
  type Modifiers,
  type PokemonOptionVisual,
  type PokemonSequenceVisual,
  type PokemonCatalog,
  type PokemonKnowledge,
  type QuestionCategory,
  type QuestionData,
  type QuestionPrompt,
  type StatName,
} from './types';

export const defaultModifiers: Modifiers = {
  generations: [...generations],
  knowledgeCategories: [...knowledgeCategories],
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

const isKnowledgeCategory = (value: unknown): value is KnowledgeCategory =>
  typeof value === 'string' &&
  knowledgeCategories.includes(value as KnowledgeCategory);

export const normalizeModifiers = (value: unknown): Modifiers => {
  if (!value || typeof value !== 'object') return defaultModifiers;

  const candidate = value as Partial<Modifiers>;
  const selectedGenerations = Array.isArray(candidate.generations)
    ? candidate.generations.filter(isGeneration)
    : [];
  const selectedCategories = Array.isArray(candidate.knowledgeCategories)
    ? candidate.knowledgeCategories.filter(isKnowledgeCategory)
    : [];
  const limit = Number.isFinite(candidate.limit)
    ? Math.max(1, Math.trunc(candidate.limit as number))
    : defaultModifiers.limit;

  return {
    generations:
      selectedGenerations.length > 0
        ? selectedGenerations
        : defaultModifiers.generations,
    knowledgeCategories:
      selectedCategories.length > 0
        ? selectedCategories
        : defaultModifiers.knowledgeCategories,
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

const getPokemonOptionVisual = (
  pokemon: PokemonKnowledge,
): PokemonOptionVisual | undefined =>
  pokemon.sprite
    ? {
        dexNumber: pokemon.id,
        src: pokemon.sprite,
      }
    : undefined;

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

const getSequenceVisual = (
  name: string,
  pokemon: PokemonKnowledge,
): PokemonSequenceVisual | undefined => {
  const visual = getPokemonOptionVisual(pokemon);
  return visual ? { ...visual, name } : undefined;
};

const addQuestionVisuals = (
  context: QuestionContext,
  question: QuestionData,
): QuestionData => {
  if (question.optionVisuals) return question;

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

type EvolutionTriple = readonly [Candidate, Candidate, Candidate];

const getEvolutionTriples = (context: QuestionContext): EvolutionTriple[] => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  return context.pool.flatMap((first) =>
    first.pokemon.evolvesTo.flatMap((middleName) => {
      if (!poolNames.has(middleName)) return [];
      const middlePokemon = context.catalog.pokemon[middleName];
      if (!middlePokemon) return [];
      const middle = { name: middleName, pokemon: middlePokemon };
      return middlePokemon.evolvesTo.flatMap((lastName) => {
        if (!poolNames.has(lastName)) return [];
        const lastPokemon = context.catalog.pokemon[lastName];
        return lastPokemon
          ? ([
              [first, middle, { name: lastName, pokemon: lastPokemon }],
            ] as const)
          : [];
      });
    }),
  );
};

const buildMissingEvolutionQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const triples = getEvolutionTriples(context).filter(([, middle]) =>
    Boolean(middle.pokemon.sprite),
  );
  const fresh = triples.filter(([, middle]) => !context.used.has(middle.name));
  const triple = pick(fresh.length > 0 ? fresh : triples, context.random);
  if (!triple) return undefined;
  const [first, target, last] = triple;
  context.used.add(target.name);
  const excluded = triple.map(({ name }) => name);
  const options = optionSet(
    target.name,
    context.pool
      .filter(({ name, pokemon }) => pokemon.sprite && !excluded.includes(name))
      .map(({ name }) => name),
    context.random,
  );
  const sequenceVisuals = [first, last].flatMap(({ name, pokemon }) => {
    const visual = getSequenceVisual(name, pokemon);
    return visual ? [visual] : [];
  });
  if (options.length !== 4 || sequenceVisuals.length !== 2) return undefined;

  return {
    ...makeQuestion(
      'evolution',
      target,
      target.name,
      options,
      textPrompt('Choose the missing Pokémon.'),
    ),
    explanation: `${formatPokemonName(first.name)} evolves into ${formatPokemonName(target.name)}, then ${formatPokemonName(last.name)}.`,
    sequenceVisuals,
    title: 'Missing evolution',
  };
};

const buildEvolutionOrderQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const triples = getEvolutionTriples(context).filter((triple) =>
    triple.every(({ pokemon }) => Boolean(pokemon.sprite)),
  );
  const fresh = triples.filter((triple) =>
    triple.every(({ name }) => !context.used.has(name)),
  );
  const triple = pick(fresh.length > 0 ? fresh : triples, context.random);
  if (!triple) return undefined;
  const [, target] = triple;
  const correctOptions = triple.map(({ name }) => name);
  correctOptions.forEach((name) => context.used.add(name));
  const options = shuffle(correctOptions, context.random);

  return {
    ...makeQuestion(
      'evolution',
      target,
      correctOptions[0] ?? target.name,
      options,
      textPrompt('Tap these Pokémon in evolution order.'),
    ),
    answer: { correctOptions, interaction: 'ordering' },
    explanation: correctOptions.map(formatPokemonName).join(' → '),
    optionVisuals: getOptionVisuals(context, options),
    title: 'Evolution order',
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

type QuestionBuilder = () => QuestionData | undefined;

const buildQuestionVariant = (
  context: QuestionContext,
  builders: readonly QuestionBuilder[],
): QuestionData | undefined => {
  for (const builder of shuffle(builders, context.random)) {
    const question = builder();
    if (question) return question;
  }
  return undefined;
};

const buildCategoryQuestion = (
  context: QuestionContext,
  category: QuestionCategory,
  silhouette = false,
): QuestionData | undefined => {
  let question: QuestionData | undefined;

  switch (category) {
    case 'identity':
      question = buildQuestionVariant(context, [
        () => buildIdentityQuestion(context, silhouette),
        () => buildSilhouetteMatchQuestion(context),
        () => buildPixelPeekQuestion(context),
        () => buildShinySpotterQuestion(context),
      ]);
      break;
    case 'description':
      question = buildDescriptionQuestion(context);
      break;
    case 'type':
      question = buildQuestionVariant(context, [
        () => buildTypeQuestion(context),
        () => buildOddOneOutQuestion(context),
        () => buildChooseAllTypeQuestion(context),
      ]);
      break;
    case 'evolution':
      question = buildQuestionVariant(context, [
        () => buildEvolutionQuestion(context),
        () => buildMissingEvolutionQuestion(context),
        () => buildEvolutionOrderQuestion(context),
      ]);
      break;
    case 'ability':
    case 'move':
      question = buildPropertyQuestion(context, category);
      break;
    case 'stat':
      question = buildStatQuestion(context);
      break;
    case 'matchup':
      question = buildMatchupQuestion(context);
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
  const categoryDeck = shuffle(modifiers.knowledgeCategories, random);
  const questions: QuestionData[] = [];

  for (let index = 0; index < count; index += 1) {
    const category = categoryDeck[index % categoryDeck.length];
    if (!category) break;
    const question = buildCategoryQuestion(
      context,
      category,
      category === 'identity' && random() < 0.5,
    );
    const fallback = question ?? buildIdentityQuestion(context, false);
    if (!fallback) continue;
    questions.push({ ...fallback, id: `${fallback.id}:${index}` });
  }

  return questions;
};

export const buildQuestionSequence = (
  catalog: PokemonCatalog,
  categories: readonly QuestionCategory[],
  modifiers: Modifiers,
  random: () => number,
): QuestionData[] => {
  const pool = filterPokemon(catalog, modifiers)
    .map((name) => ({ name, pokemon: catalog.pokemon[name] }))
    .filter((candidate): candidate is Candidate => Boolean(candidate.pokemon));
  const context: QuestionContext = { catalog, pool, random, used: new Set() };

  return categories.flatMap((category, index) => {
    const question = buildCategoryQuestion(
      context,
      category,
      category === 'identity',
    );
    return question ? [{ ...question, id: `${question.id}:${index}` }] : [];
  });
};

export const getAnswerPoints = (
  question: QuestionData,
  correct: boolean,
  cluesShown = 1,
): number => {
  if (!correct) return 0;
  if (question.category !== 'champion') return 100;
  return [100, 75, 50, 25][Math.max(0, Math.min(3, cluesShown - 1))] ?? 25;
};

export const getKnowledgePoints = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + answer.points, 0);

const speedBonusRate = 0.25;
const speedBonusHalfLifeMilliseconds = 8_000;

export const getSpeedBonusPoints = (
  knowledgePoints: number,
  responseMilliseconds: number,
): number => {
  if (knowledgePoints <= 0) return 0;
  const elapsedMilliseconds = Math.max(0, responseMilliseconds);
  return Math.round(
    knowledgePoints *
      speedBonusRate *
      2 ** (-elapsedMilliseconds / speedBonusHalfLifeMilliseconds),
  );
};

export const getSpeedBonus = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + (answer.speedBonus ?? 0), 0);

export const getMasteryBonus = (answers: readonly AnswerResult[]): number => {
  if (answers.length === 0) return 0;
  const knowledgePoints = getKnowledgePoints(answers);
  return Math.round(
    (knowledgePoints * knowledgePoints) / (answers.length * 100),
  );
};

export const getMaximumScore = (questionCount: number): number =>
  Math.max(0, questionCount) * 225;

export const calculateScore = (answers: readonly AnswerResult[]): number =>
  getKnowledgePoints(answers) +
  getSpeedBonus(answers) +
  getMasteryBonus(answers);

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];

export const getCorrectOptions = (question: QuestionData): string[] =>
  question.answer.correctOptions;

export const isQuestionAnswerCorrect = (
  question: QuestionData,
  selectedOptions: readonly string[],
): boolean => {
  if (question.answer.interaction === 'ordering') {
    return question.answer.correctOptions.every(
      (option, index) => selectedOptions[index] === option,
    );
  }

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
