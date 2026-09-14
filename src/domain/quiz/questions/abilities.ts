import { formatPokemonName } from '../../pokemon/format';
import { targetMedia } from './assembly';
import type { QuestionBuilder } from './context';
import { pokemonPrompt } from './prompts';
import {
  makeTopicQuestion,
  ordered,
  orderedPokemon,
  pokemonSubject,
  topicEligible,
} from './topic-support';

export const buildHidden: QuestionBuilder = (context) => {
  const pool = orderedPokemon(context, context.pool);
  for (const target of pool) {
    const slots = target.pokemon.abilitySlots;
    const hidden = slots
      ?.filter((slot) => slot.hidden)
      .map((slot) => slot.name);
    if (
      !hidden ||
      hidden.length !== 1 ||
      (!context.variant?.allowMissingSprites && !target.pokemon.sprite)
    )
      continue;
    const allowed = new Set(
      (context.catalog.topics?.abilities ?? [])
        .filter((ability) => topicEligible(context, ability))
        .map((ability) => ability.name),
    );
    if (slots!.some((slot) => !allowed.has(slot.name))) continue;
    const correct = hidden[0]!;
    const ordinary = [
      ...new Set(
        slots!.filter((slot) => !slot.hidden).map((slot) => slot.name),
      ),
    ].filter((name) => name !== correct);
    const similar = pool.filter(
      ({ pokemon }) =>
        !context.variant?.hiddenAbility ||
        context.variant.hiddenAbility !== 'similar' ||
        pokemon.types.some((type) => target.pokemon.types.includes(type)),
    );
    const other = ordered(context, [
      ...new Set(
        similar.flatMap(
          ({ pokemon }) => pokemon.abilitySlots?.map((slot) => slot.name) ?? [],
        ),
      ),
    ]).filter(
      (name) =>
        allowed.has(name) && name !== correct && !ordinary.includes(name),
    );
    const options = [correct, ...ordinary, ...other].slice(0, 4);
    const question = makeTopicQuestion(
      context,
      pokemonSubject(target),
      `What is ${target.pokemon.displayName}’s Hidden Ability?`,
      correct,
      options,
      {
        prompt: pokemonPrompt(target, 'What is ', '’s Hidden Ability?'),
        media: targetMedia(target),
        explanation: `Hidden Ability: ${formatPokemonName(correct)}. Ordinary abilities: ${ordinary.map(formatPokemonName).join(', ') || 'none'}.`,
      },
      'ability',
    );
    if (question) return question;
  }
};
