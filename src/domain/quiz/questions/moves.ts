import { formatPokemonName } from '../../pokemon/format.ts';
import { generations } from '../../pokemon/types.ts';
import type { QuestionBuilder } from './context.ts';
import {
  makeTopicQuestion,
  ordered,
  topicEligible,
  topicSubject,
} from './topic-support.ts';

const purposeExcludedMoves = new Set([
  'photon-geyser',
  'light-that-burns-the-sky',
  'shell-side-arm',
  'tera-blast',
  'tera-starstorm',
]);

export const buildMove: QuestionBuilder = (context) => {
  const topics = context.catalog.topics;
  if (!topics) return;
  const pool = ordered(
    context,
    topics.moves.filter(
      (move) =>
        topicEligible(context, move) &&
        Object.hasOwn(context.catalog.typeRelations, move.type) &&
        ['physical', 'special', 'status'].includes(move.damageClass),
    ),
  );
  for (const target of pool) {
    const purpose = context.questionType === 'move-purpose';
    if (purpose && purposeExcludedMoves.has(target.name)) continue;
    const contexts = target.contexts.filter(
      (entry) =>
        (context.generations ?? generations).includes(entry.generation) &&
        (!purpose || generations.indexOf(entry.generation) >= 3),
    );
    for (const rules of ordered(context, contexts)) {
      if (
        !purpose &&
        context.variant?.excludeTypeHintNames &&
        target.label.toLowerCase().includes(rules.type)
      )
        continue;
      if (context.variant?.reviewedDescription && !target.reviewedDescription)
        continue;
      const game = topics.games[rules.game];
      if (!game) continue;
      if (purpose) {
        if (
          context.variant?.damageClass === 'status' &&
          rules.damageClass !== 'status'
        )
          continue;
        const wrong = pool
          .filter(
            (move) =>
              !purposeExcludedMoves.has(move.name) &&
              move.contexts.some(
                (entry) =>
                  entry.game === rules.game &&
                  entry.damageClass !== rules.damageClass &&
                  (!context.variant?.sameMoveType || entry.type === rules.type),
              ),
          )
          .slice(0, 3);
        const options = [target, ...wrong];
        const question = makeTopicQuestion(
          context,
          {
            ...topicSubject(context, 'move', target),
            generation: rules.generation,
          },
          `Which is a ${rules.damageClass} move?`,
          target.name,
          options.map((move) => move.name),
          {
            prompt: {
              kind: 'text',
              text: `Which is a ${rules.damageClass} move?`,
              supportingText: `Pokémon ${game.label}`,
            },
            context: rules.game,
            optionLabels: Object.fromEntries(
              options.map((move) => [move.name, move.label]),
            ),
            optionReveals: Object.fromEntries(
              options.map((move) => {
                const entry = move.contexts.find(
                  (entry) => entry.game === rules.game,
                )!;
                return [
                  move.name,
                  `${formatPokemonName(entry.type)} · ${formatPokemonName(entry.damageClass)}`,
                ];
              }),
            ),
          },
          'move',
        );
        if (question) return question;
      } else {
        const types = Object.keys(context.catalog.typeRelations);
        const options = context.variant?.fullList
          ? types
          : [
              rules.type,
              ...ordered(
                context,
                types.filter((type) => type !== rules.type),
              ).slice(0, 3),
            ];
        return makeTopicQuestion(
          context,
          {
            ...topicSubject(context, 'move', target),
            generation: rules.generation,
          },
          `What is the default type of ${target.label}?${context.variant?.reviewedDescription ? ` ${target.reviewedDescription}` : ''}`,
          rules.type,
          options,
          {
            prompt: {
              kind: 'text',
              text: `What is the default type of ${target.label}?${context.variant?.reviewedDescription ? ` ${target.reviewedDescription}` : ''}`,
              supportingText: `Pokémon ${game.label}`,
            },
            context: rules.game,
            optionLabels: Object.fromEntries(
              options.map((type) => [type, formatPokemonName(type)]),
            ),
            explanation: `${target.label} is ${formatPokemonName(rules.type)} type in Pokémon ${game.label}.`,
          },
          'move',
        );
      }
    }
  }
};
