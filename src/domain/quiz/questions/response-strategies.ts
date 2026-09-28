import { attackMultiplier } from '../../pokemon/type-effectiveness.ts';
import { choosePokemonSprite, getOptionVisuals } from './assembly.ts';
import { spriteState } from '../question-rendering.ts';
import type { Difficulty } from '../difficulty.ts';
import type { QuestionContext, QuestionDraft } from './context.ts';
import type { FamilyRules } from './family-rules.ts';

/** Choice buttons, search, or a type grid; families constrain the usable cases. */
export type ResponseStrategy =
  | {
      kind: 'choices';
      /** Minimum count required before the question can be offered. */
      minimumOptions: 2 | 4;
    }
  | {
      kind: 'search';
      /** Search either the eligible Pokémon pool or builder-supplied entries. */
      candidates: 'pool' | 'provided';
    }
  | {
      kind: 'type-grid';
      /** Select the subject's types or every type with the asked multiplier. */
      correct: 'subject-types' | 'effectiveness';
    };

/** Reject generated choices with no field visible before the player answers. */
export const hasVisibleChoices = (question: QuestionDraft): boolean => {
  if (question.answer.interaction === 'search') return true;
  const policy = question.rendering?.choices;
  const kind = question.view?.answer.kind;
  if (!policy || (kind !== 'pokemon' && kind !== 'item')) return true;
  const spriteVisible = spriteState(policy.sprite, {
    answered: false,
    cluesShown: question.initialClues ?? 0,
  }).visible;
  return question.options.every((option) => {
    if (kind === 'item')
      return (
        policy.name === 'always' ||
        (spriteVisible && Boolean(question.optionImages?.[option]))
      );
    const visual = question.optionVisuals?.[option];
    return (
      policy.name === 'always' ||
      (policy.number === 'always' &&
        (visual?.dexNumber ?? question.optionDexNumbers?.[option]) !==
          undefined) ||
      (policy.types === 'always' && Boolean(visual?.types.length)) ||
      (spriteVisible && Boolean(visual?.src))
    );
  });
};

/** A Pokémon named by the prompt needs at least one visible identifying field. */
export const hasVisibleSubject = (question: QuestionDraft): boolean => {
  if (
    question.prompt.kind !== 'pokemon' ||
    question.subject.kind !== 'pokemon' ||
    !question.rendering
  )
    return true;
  const policy = question.rendering.subject;
  if (
    policy.name === 'always' ||
    policy.number === 'always' ||
    (policy.types === 'always' && Boolean(question.subject.types?.length))
  )
    return true;
  return (
    question.media.kind !== 'none' &&
    spriteState(policy.sprite, {
      answered: false,
      cluesShown: question.initialClues ?? 0,
    }).visible
  );
};

/** Apply resolved response and presentation rules and snapshot them on the draft. */
export const applyResponseStrategy = (
  draft: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
  level?: Difficulty,
): QuestionDraft => {
  const question: QuestionDraft = {
    ...draft,
    ...(level === undefined ? {} : { variantLevel: level }),
    rendering: rules.rendering,
    view: rules.view,
  };
  const subjectSource = rules.rendering.subject.sprite
    ? (rules.rendering.subject.sprite.source ?? 'front')
    : undefined;
  if (
    subjectSource &&
    question.subject.kind === 'pokemon' &&
    question.media.kind === 'none' &&
    (question.prompt.kind === 'pokemon' ||
      (rules.response.kind === 'search' &&
        rules.rendering.subject.sprite?.reveal === 'after-answer'))
  ) {
    const pokemon = context.catalog.pokemon[question.subject.name];
    const src =
      pokemon && choosePokemonSprite(pokemon, subjectSource, context.random);
    if (src) question.media = { kind: 'pixel-sprite', src };
  }
  if (
    subjectSource === 'all' &&
    draft.media.kind !== 'none' &&
    context.questionType !== 'pokemonFromHistoricalSprite' &&
    question.subject.kind === 'pokemon' &&
    (question.media.kind === 'sprite' || question.media.kind === 'pixel-sprite')
  ) {
    const pokemon = context.catalog.pokemon[question.subject.name];
    const src = pokemon && choosePokemonSprite(pokemon, 'all', context.random);
    if (src) question.media = { ...question.media, src };
  }
  if (
    question.visual?.kind === 'evolutionChain' ||
    question.visual?.kind === 'evolution-endpoints'
  ) {
    question.visual = {
      ...question.visual,
      stages: Object.fromEntries(
        Object.entries(question.visual.stages).map(([name, stage]) => {
          const source =
            name === question.subject.name
              ? subjectSource
              : rules.rendering.related.sprite?.source;
          const pokemon = context.catalog.pokemon[name];
          return [
            name,
            source === 'all' && pokemon
              ? {
                  ...stage,
                  src: choosePokemonSprite(pokemon, 'all', context.random),
                }
              : stage,
          ];
        }),
      ),
    };
  }
  if (
    question.visual?.kind === 'evolutionGainedType' &&
    rules.rendering.related.sprite?.source === 'all'
  ) {
    const pokemon = context.catalog.pokemon[question.visual.evolution.name];
    if (pokemon)
      question.visual = {
        ...question.visual,
        evolution: {
          ...question.visual.evolution,
          src: choosePokemonSprite(pokemon, 'all', context.random),
        },
      };
  }
  if (question.media.kind === 'pokemonFromPixelCrop' && 'cropScale' in rules) {
    question.media = {
      ...question.media,
      zoom: (question.media.zoom ?? 1) * rules.cropScale,
    };
  }
  const response = rules.response;
  if (response.kind === 'search') {
    question.answer = { ...question.answer, interaction: 'search' };
    question.optionVisuals = undefined;
    question.optionDexNumbers = undefined;
    if (response.candidates === 'pool')
      question.searchOptions = context.pool.map(({ name, pokemon }) => ({
        name,
        dexNumber: pokemon.speciesId,
        sprite: choosePokemonSprite(
          pokemon,
          rules.rendering.search.sprite?.source ?? 'front',
          context.random,
        ),
        types: pokemon.types,
      }));
  }
  if (rules.response.kind === 'type-grid') {
    question.options = Object.keys(context.catalog.typeRelations);
    question.answer = {
      interaction: 'multi-select',
      correctOptions:
        rules.response.correct === 'subject-types'
          ? (question.subject.types ?? [])
          : question.options.filter(
              (type) =>
                question.visual?.kind === 'typeMatchup' &&
                attackMultiplier(
                  context.catalog,
                  type,
                  question.subject.types ?? [],
                ) === question.visual.multiplier,
            ),
    };
    if (question.prompt.kind === 'pokemon')
      question.prompt = {
        ...question.prompt,
        before:
          rules.response.correct === 'subject-types'
            ? 'Select every type of '
            : question.prompt.before.replace(
                'Which type has',
                'Select every type with',
              ),
        after: '.',
      };
  }
  if ('finale' in rules && rules.finale) {
    const { opening, assistance, penalty } = rules.finale;
    question.initialClues = penalty;
    question.assistanceAllowed = assistance;
    question.answer = {
      ...question.answer,
      interaction: opening === 'search' ? 'search' : 'single-choice',
    };
    const genusClue = question.clues?.[0];
    question.suppliedClues =
      typeof genusClue === 'string' && opening === 'choices-types'
        ? [genusClue]
        : [];
  }
  if (rules.view.answer.kind === 'pokemon') {
    if (response.kind !== 'search') {
      const choiceSource = rules.rendering.choices.sprite?.source;
      question.optionVisuals = {
        ...getOptionVisuals(context, question.options),
        ...question.optionVisuals,
      };
      if (choiceSource === 'all')
        for (const option of question.options) {
          const pokemon = context.catalog.pokemon[option];
          if (pokemon)
            question.optionVisuals[option] = {
              ...question.optionVisuals[option],
              dexNumber: pokemon.speciesId,
              types: pokemon.types,
              src: choosePokemonSprite(pokemon, 'all', context.random),
            };
        }
    }
    if (question.searchOptions)
      question.searchOptions = question.searchOptions.map((option) => {
        const pokemon = context.catalog.pokemon[option.name];
        return pokemon
          ? {
              ...option,
              dexNumber: option.dexNumber ?? pokemon.speciesId,
              sprite:
                rules.rendering.search.sprite?.source === 'all'
                  ? choosePokemonSprite(pokemon, 'all', context.random)
                  : (option.sprite ?? pokemon.sprite),
              types: pokemon.types,
            }
          : option;
      });
  }
  return question;
};
