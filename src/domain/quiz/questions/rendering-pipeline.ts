import { spriteState } from '../rendering.ts';
import { moveVisual } from '../move-presentation.ts';
import { choosePokemonSprite, getOptionVisuals } from './assembly.ts';
import { applyResponseStrategy } from './response-strategies.ts';
import type { Level } from '../level.ts';
import type { QuestionContext, QuestionDraft } from './context.ts';
import type { FamilyRules } from './family-rules.ts';

/** Reject generated choices with no field visible before the player answers. */
export const hasVisibleChoices = (question: QuestionDraft): boolean => {
  if (question.answer.interaction === 'search') return true;
  const policy = question.rendering?.choices;
  const kind = question.view?.answer.kind;
  if (!policy || (kind !== 'pokemon' && kind !== 'item' && kind !== 'move'))
    return true;
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
    if (kind === 'move')
      return (
        policy.name === 'always' ||
        (spriteVisible && Boolean(question.optionMoves?.[option]?.sprite))
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

const applySubjectAndRelatedRendering = (
  question: QuestionDraft,
  draft: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
): void => {
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
};

const applyAnswerRendering = (
  question: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
): void => {
  const response = rules.response;
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
  if (rules.view.answer.kind === 'move' && response.kind !== 'search') {
    const moves = new Map(
      context.catalog.topics?.moves.map((move) => [move.name, move]) ?? [],
    );
    question.optionMoves = Object.fromEntries(
      question.options.flatMap((name) => {
        const move = moves.get(name);
        if (!move) return [];
        const version = move.contexts.find(
          (entry) => entry.game === question.context,
        );
        return [
          [
            name,
            moveVisual(
              version?.type ?? move.type,
              version?.damageClass ?? move.damageClass,
            ),
          ],
        ];
      }),
    );
  }
};

/** Snapshot the rules, then compose entity rendering, response, and answer visuals. */
export const assembleQuestion = (
  draft: QuestionDraft,
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
  level?: Level,
): QuestionDraft => {
  const question: QuestionDraft = {
    ...draft,
    ...(level === undefined ? {} : { variantLevel: level }),
    rendering: rules.rendering,
    view: rules.view,
  };
  applySubjectAndRelatedRendering(question, draft, context, rules);
  applyResponseStrategy(question, context, rules);
  applyAnswerRendering(question, context, rules);
  return question;
};
