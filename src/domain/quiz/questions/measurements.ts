import {
  formatMeasurement,
  isMeasurementClusterMember,
  isMeasurementSeparation,
  measurementWinner,
} from '../measurement-comparison.ts';
import type { QuestionBuilder } from './context.ts';
import {
  distinctPokemon,
  makeTopicQuestion,
  orderedPokemon,
  picturedPokemon,
  pokemonSubject,
} from './topic-support.ts';

export const buildMeasurement =
  (measurement: 'height' | 'weight'): QuestionBuilder =>
  (context) => {
    const rules = context.variant?.measurement;
    if (!rules) return;
    const pool = distinctPokemon(
      orderedPokemon(
        context,
        context.pool.filter(
          ({ pokemon }) =>
            Number.isSafeInteger(pokemon[measurement]) &&
            pokemon[measurement]! > 0,
        ),
      ),
    );
    const direction = context.random() < 0.5 ? 'highest' : 'lowest';
    for (const target of pool) {
      const value = target.pokemon[measurement]!;
      const candidates = pool.filter(
        (candidate) =>
          (direction === 'highest'
            ? candidate.pokemon[measurement]! < value
            : candidate.pokemon[measurement]! > value) &&
          isMeasurementClusterMember(
            value,
            candidate.pokemon[measurement]!,
            direction,
            rules,
          ),
      );
      for (const nearest of candidates.filter((candidate) =>
        isMeasurementSeparation(
          value,
          candidate.pokemon[measurement]!,
          direction,
          rules,
        ),
      )) {
        const seen = new Set<number>([value, nearest.pokemon[measurement]!]);
        const rest = candidates.filter((candidate) =>
          direction === 'highest'
            ? candidate.pokemon[measurement]! < nearest.pokemon[measurement]!
            : candidate.pokemon[measurement]! > nearest.pokemon[measurement]!,
        );
        const chosen = [
          target,
          nearest,
          ...rest
            .filter((candidate) => {
              const n = candidate.pokemon[measurement]!;
              if (seen.has(n)) return false;
              seen.add(n);
              return true;
            })
            .slice(0, 2),
        ];
        const values = chosen.map(
          (candidate) => candidate.pokemon[measurement]!,
        );
        if (measurementWinner(values, direction, rules) !== 0) continue;
        return makeTopicQuestion(
          context,
          pokemonSubject(target),
          `Which Pokémon is ${measurement === 'weight' ? (direction === 'highest' ? 'heaviest' : 'lightest') : direction === 'highest' ? 'tallest' : 'shortest'}?`,
          target.name,
          chosen.map((candidate) => candidate.name),
          {
            ...picturedPokemon(context, chosen),
            visual: { kind: 'measurement-comparison', measurement, direction },
            optionReveals: Object.fromEntries(
              chosen.map((candidate) => [
                candidate.name,
                formatMeasurement(candidate.pokemon[measurement]!, measurement),
              ]),
            ),
          },
        );
      }
    }
  };
