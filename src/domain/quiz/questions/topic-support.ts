import { shuffle } from '../../../lib/random';
import { generations, type Generation } from '../../pokemon/types';
import type { TopicEntity } from '../topic-catalog';
import type { QuestionCategory, QuestionSubject } from '../types';
import { getOptionVisuals } from './assembly';
import type { Candidate, QuestionContext, QuestionDraft } from './context';
import { pickForm } from './sampling';
import { orderSpecies, distinctPokemon as uniquePokemon } from './selection';

export const topicEligible = (context: QuestionContext, entity: TopicEntity) =>
  entity.generations.some((generation) =>
    (context.generations ?? generations).includes(generation),
  );
const topicGeneration = (
  context: QuestionContext,
  entity: TopicEntity,
): Generation =>
  entity.generations.find((generation) =>
    (context.generations ?? generations).includes(generation),
  )!;
export const ordered = <T>(
  context: QuestionContext,
  values: readonly T[],
): T[] => shuffle(values, context.random);
export const orderedPokemon = (
  context: QuestionContext,
  candidates: readonly Candidate[],
) =>
  orderSpecies(context, candidates).flatMap((group) => {
    const form = pickForm(group, context.random);
    return form ? [form] : [];
  });
export const distinctPokemon = (candidates: Candidate[]) =>
  uniquePokemon(
    candidates.filter(({ pokemon }) => !!pokemon.sprite),
    (candidate) => candidate,
  );
export const pokemonSubject = (target: Candidate): QuestionSubject => ({
  kind: 'pokemon',
  name: target.name,
  generation: target.pokemon.generation,
  types: target.pokemon.types,
});
export const topicSubject = (
  context: QuestionContext,
  kind: QuestionSubject['kind'],
  target: TopicEntity,
): QuestionSubject => ({
  kind,
  name: target.name,
  generation: topicGeneration(context, target),
});
export const makeTopicQuestion = (
  context: QuestionContext,
  subject: QuestionSubject,
  prompt: string,
  correct: string | string[],
  options: string[],
  details: Partial<QuestionDraft> = {},
  category: QuestionCategory = 'knowledge',
): QuestionDraft | undefined => {
  const labels = details.optionLabels ?? {};
  const correctOptions = typeof correct === 'string' ? [correct] : correct;
  if (
    correctOptions.length === 0 ||
    !correctOptions.every((value) => options.includes(value)) ||
    new Set(options).size !== options.length ||
    new Set(options.map((option) => labels[option] ?? option)).size !==
      options.length ||
    options.length < (context.variant?.fullList ? 2 : 4)
  )
    return;
  const primary = [
    ...(subject.kind === 'pokemon' ? [subject.name] : []),
    ...(details.visual?.kind === 'evolution-endpoints'
      ? [details.visual.before, details.visual.after]
      : []),
  ];
  const pokemon = Object.keys(details.optionVisuals ?? {});
  const identity = JSON.stringify([
    subject.kind,
    subject.name,
    details.context ?? null,
    typeof correct === 'string' ? correct : [...correctOptions].sort(),
    [...options].sort(),
  ]);
  return {
    id: `${context.questionType}:${subject.kind}:${subject.name}`,
    subject,
    category,
    prompt: { kind: 'text', text: prompt },
    options: ordered(context, options),
    answer: {
      interaction:
        typeof correct === 'string' ? 'single-choice' : 'multi-select',
      correctOptions,
    },
    media: { kind: 'none' },
    repetition: {
      identity,
      subjects: [
        subject.kind === 'pokemon'
          ? subject.name
          : `${subject.kind}/${subject.name}`,
      ],
      primary: [
        ...new Set([
          ...primary,
          ...pokemon.filter((name) => correctOptions.includes(name)),
        ]),
      ],
      distractors: pokemon.filter(
        (name) => !correctOptions.includes(name) && !primary.includes(name),
      ),
    },
    ...details,
  };
};
export const picturedPokemon = (
  context: QuestionContext,
  candidates: Candidate[],
) => ({
  optionVisuals: getOptionVisuals(
    context,
    candidates.map(({ name }) => name),
  ),
  optionLabels: Object.fromEntries(
    candidates.map(({ name, pokemon }) => [name, pokemon.displayName]),
  ),
});
