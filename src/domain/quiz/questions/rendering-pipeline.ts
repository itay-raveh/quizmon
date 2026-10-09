import { sampleRendering, spriteState } from '../rendering.ts';
import { moveVisual } from '../move-presentation.ts';
import { getOptionVisuals } from './assembly.ts';
import {
  choosePokemonSprites,
  type PokemonSpriteRequest,
} from './pokemon-sprites.ts';

type SpriteAssignment = PokemonSpriteRequest & {
  apply: (src: string | null) => void;
};
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
  context: QuestionContext,
  rules: FamilyRules[keyof FamilyRules],
  sprites: SpriteAssignment[],
): void => {
  const subjectPolicy = rules.rendering.subject.sprite;
  const subjectPokemon =
    question.subject.kind === 'pokemon'
      ? context.catalog.pokemon[question.subject.name]
      : undefined;
  if (subjectPolicy && subjectPokemon) {
    if (
      question.media.kind === 'sprite' ||
      question.media.kind === 'pixel-sprite'
    ) {
      const media = question.media;
      sprites.push({
        pokemon: subjectPokemon,
        policy: subjectPolicy,
        currentFront: media.src,
        apply: (src) => {
          if (src) question.media = { ...media, src };
        },
      });
    } else if (
      question.media.kind === 'none' &&
      (question.prompt.kind === 'pokemon' ||
        subjectPolicy.reveal === 'after-answer')
    ) {
      sprites.push({
        pokemon: subjectPokemon,
        policy: subjectPolicy,
        apply: (src) => {
          if (src) question.media = { kind: 'pixel-sprite', src };
        },
      });
    }
  }
  if (
    question.visual?.kind === 'evolutionChain' ||
    question.visual?.kind === 'evolution-endpoints'
  ) {
    const visual = question.visual;
    question.visual = {
      ...visual,
      stages: Object.fromEntries(
        Object.entries(visual.stages).map(([name, stage]) => {
          const policy =
            visual.kind === 'evolutionChain' && name === question.subject.name
              ? subjectPolicy
              : rules.rendering.related.sprite;
          const pokemon = context.catalog.pokemon[name];
          const rendered = { ...stage };
          if (policy && pokemon)
            sprites.push({
              pokemon,
              policy,
              apply: (src) => {
                rendered.src = src;
              },
            });
          return [name, rendered];
        }),
      ),
    };
  }
  if (
    question.visual?.kind === 'evolutionGainedType' &&
    rules.rendering.related.sprite
  ) {
    const pokemon = context.catalog.pokemon[question.visual.evolution.name];
    if (pokemon) {
      const evolution = { ...question.visual.evolution };
      question.visual = { ...question.visual, evolution };
      sprites.push({
        pokemon,
        policy: rules.rendering.related.sprite,
        apply: (src) => {
          evolution.src = src;
        },
      });
    }
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
  sprites: SpriteAssignment[],
): void => {
  const response = rules.response;
  if (rules.view.answer.kind === 'pokemon') {
    const relatedPolicy = rules.rendering.related.sprite;
    if (relatedPolicy) {
      const visuals = getOptionVisuals(context, question.answer.correctOptions);
      question.relatedVisuals = visuals;
      for (const name of question.answer.correctOptions) {
        const pokemon = context.catalog.pokemon[name];
        const visual = visuals[name];
        if (pokemon && visual)
          sprites.push({
            pokemon,
            policy: relatedPolicy,
            apply: (src) => {
              visual.src = src;
            },
          });
      }
    }
    if (response.kind !== 'search') {
      const choicePolicy = rules.rendering.choices.sprite;
      question.optionVisuals = {
        ...getOptionVisuals(context, question.options),
        ...question.optionVisuals,
      };
      if (choicePolicy)
        for (const option of question.options) {
          const pokemon = context.catalog.pokemon[option];
          if (pokemon) {
            const visual = (question.optionVisuals[option] = {
              ...question.optionVisuals[option],
              dexNumber: pokemon.speciesId,
              types: pokemon.types,
              src: question.optionVisuals[option]?.src ?? pokemon.sprite,
            });
            sprites.push({
              pokemon,
              policy: choicePolicy,
              currentFront: visual.src,
              apply: (src) => {
                visual.src = src;
              },
            });
          }
        }
    }
    if (question.searchOptions)
      question.searchOptions = question.searchOptions.map((option) => {
        const pokemon = context.catalog.pokemon[option.name];
        if (!pokemon) return option;
        const rendered = {
          ...option,
          dexNumber: option.dexNumber ?? pokemon.speciesId,
          sprite: option.sprite ?? pokemon.sprite,
          types: pokemon.types,
        };
        if (rules.rendering.search.sprite)
          sprites.push({
            pokemon,
            policy: rules.rendering.search.sprite,
            currentFront: rendered.sprite,
            apply: (src) => {
              rendered.sprite = src;
            },
          });
        return rendered;
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
  const rendering = sampleRendering(rules.rendering, context.random);
  const resolvedRules = { ...rules, rendering };
  const question: QuestionDraft = {
    ...draft,
    ...(level === undefined ? {} : { variantLevel: level }),
    rendering,
    view: rules.view,
  };
  const sprites: SpriteAssignment[] = [];
  applySubjectAndRelatedRendering(question, context, resolvedRules, sprites);
  applyResponseStrategy(question, context, resolvedRules);
  applyAnswerRendering(question, context, resolvedRules, sprites);
  const sources = choosePokemonSprites(sprites, context.random);
  for (const [index, sprite] of sprites.entries())
    sprite.apply(sources[index]!);
  return question;
};
