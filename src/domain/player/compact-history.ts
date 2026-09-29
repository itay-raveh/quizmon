import { emptyPlayerData } from './player-save.ts';
import { applyResult } from './game-progress.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import {
  emptyQuestionHistory,
  questionRepeatPolicy,
  rememberQuestion,
} from '../quiz/history.ts';
import { questionDefinitions } from '../quiz/questions/definitions.ts';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json' with { type: 'json' };
import {
  compactRoundSchema,
  discoverCompactRound,
  scoreCompactRound,
  type CompactRound,
} from '../sync/compact-rounds.ts';

export function projectCompactRoundHistory(
  rounds: Iterable<CompactRound>,
  trainerName: string,
) {
  const data = emptyPlayerData();
  const seen = new Set<string>();
  const creditedDays = new Set<string>();
  const sorted = [...rounds].sort(
    (a, b) =>
      a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  );
  for (const round of sorted) {
    if (!compactRoundSchema.safeParse(round).success || seen.has(round.id))
      continue;
    seen.add(round.id);
    data.pokedex = [
      ...new Set([...data.pokedex, ...discoverCompactRound(round)]),
    ];
    if (round.mode === 'daily') {
      if (creditedDays.has(round.day)) continue;
      creditedDays.add(round.day);
    }
    const result = scoreCompactRound(round);
    const victory =
      round.mode === 'league' && isLeagueVictory(result)
        ? {
            id: round.id,
            trainerName,
            completedAt: round.completedAt,
            pokemon: discoverCompactRound(round),
            result,
          }
        : undefined;
    applyResult(
      data,
      round.mode === 'daily'
        ? { kind: 'daily', date: round.day }
        : { kind: round.mode },
      result,
      victory,
    );
  }
  return {
    results: data.results,
    hallOfFame: data.hallOfFame,
    pokedex: data.pokedex,
  };
}

export function recentQuestionHistory(rounds: Iterable<CompactRound>) {
  const recent = [...rounds]
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
    )
    .slice(-questionRepeatPolicy.rememberedRounds);
  let history = emptyQuestionHistory();
  const isPokemon = (name: string) => Object.hasOwn(pokemonGenerations, name);
  for (const round of recent) {
    for (const answer of round.answers) {
      const definition =
        answer.type === 'champion' ? null : questionDefinitions[answer.type];
      const pokemonOptions =
        answer.type === 'champion' || definition?.answerIsPokemon;
      const primary = [
        ...new Set(
          [answer.subject, ...(pokemonOptions ? answer.expected : [])].filter(
            isPokemon,
          ),
        ),
      ];
      history = rememberQuestion(history, {
        questionType: answer.type,
        subject: { name: answer.subject },
        answer: { correctOptions: answer.expected },
        repetition: {
          identity: '',
          subjects: [answer.subject],
          primary,
          distractors: pokemonOptions
            ? (answer.options ?? []).filter(
                (name) => isPokemon(name) && !primary.includes(name),
              )
            : [],
        },
      });
    }
  }
  return history;
}
