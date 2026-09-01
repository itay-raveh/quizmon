import {
  generations,
  knowledgeCategories,
  statNames,
  type AnswerResult,
  type Generation,
  type KnowledgeCategory,
  type Modifiers,
  type PokemonCatalog,
  type PokemonKnowledge,
  type QuestionCategory,
  type QuestionData,
  type StatName,
} from './types';

export const defaultModifiers: Modifiers = {
  generations: ['I'],
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
  scale: 'Size check',
  stat: 'Stat showdown',
  type: 'Type check',
};

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
  prompt: string,
  media: QuestionData['media'] = { kind: 'none' },
): QuestionData => ({
  category,
  correctOption,
  id: `${category}:${target.name}`,
  media,
  options,
  pokemonName: target.name,
  prompt,
});

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
    silhouette ? 'Who is hiding in this silhouette?' : 'Who is this Pokémon?',
    { kind: 'sprite', silhouette, src: target.pokemon.sprite },
  );
};

const scaleMetrics = ['height', 'weight'] as const;

const buildScaleQuestion = (
  context: QuestionContext,
): QuestionData | undefined => {
  const metric = pick(scaleMetrics, context.random) ?? 'height';
  const findHighest = context.random() < 0.5;
  const candidates = shuffle(
    context.pool.filter(({ pokemon }) => pokemon[metric] > 0),
    context.random,
  );
  const fresh = candidates.filter(({ name }) => !context.used.has(name));
  const target = [...fresh, ...candidates].find(({ pokemon }) => {
    const distractors = candidates.filter(({ pokemon: other }) =>
      findHighest
        ? other[metric] < pokemon[metric]
        : other[metric] > pokemon[metric],
    );
    return distractors.length >= 3;
  });
  if (!target) return undefined;

  context.used.add(target.name);
  const distractors = candidates
    .filter(({ name, pokemon }) => {
      if (name === target.name) return false;
      return findHighest
        ? pokemon[metric] < target.pokemon[metric]
        : pokemon[metric] > target.pokemon[metric];
    })
    .map(({ name }) => name);
  const adjective =
    metric === 'height'
      ? findHighest
        ? 'tallest'
        : 'shortest'
      : findHighest
        ? 'heaviest'
        : 'lightest';

  return makeQuestion(
    'scale',
    target,
    target.name,
    optionSet(target.name, distractors, context.random),
    `Which Pokémon is the ${adjective}?`,
  );
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
    `“${redactName(target.pokemon.description, target.name)}” belongs to…`,
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
    `Which type does ${formatPokemonName(target.name)} have?`,
  );
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
    `Which Pokémon can ${formatPokemonName(target.name)} evolve into?`,
  );
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
    `Which ${subject} can ${formatPokemonName(target.name)} have?`,
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
    `Which Pokémon has the highest base ${formatPokemonName(stat)}?`,
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
    `Which type is super effective against ${formatPokemonName(target.name)}?`,
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
      'Name the Pokémon. Reveal fewer clues to earn more points.',
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

const buildCategoryQuestion = (
  context: QuestionContext,
  category: QuestionCategory,
  silhouette = false,
): QuestionData | undefined => {
  switch (category) {
    case 'identity':
      return buildIdentityQuestion(context, silhouette);
    case 'scale':
      return buildScaleQuestion(context);
    case 'description':
      return buildDescriptionQuestion(context);
    case 'type':
      return buildTypeQuestion(context);
    case 'evolution':
      return buildEvolutionQuestion(context);
    case 'ability':
    case 'move':
      return buildPropertyQuestion(context, category);
    case 'stat':
      return buildStatQuestion(context);
    case 'matchup':
      return buildMatchupQuestion(context);
    case 'champion':
      return buildChampionQuestion(context);
  }
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

export const calculateScore = (answers: readonly AnswerResult[]): number =>
  answers.reduce((total, answer) => total + answer.points, 0);

export const getCategoryLabel = (category: QuestionCategory): string =>
  categoryLabels[category];

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
