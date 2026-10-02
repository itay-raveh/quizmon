import type { PokemonCatalog } from '../../pokemon/types.ts';
import { recentQuestionHistory } from '../../player/compact-history.ts';
import type { CompactRound } from '../../sync/compact-rounds.ts';
import {
  emptyQuestionHistory,
  getQuestionRecency,
  rememberQuestion,
} from '../history.ts';
import type { QuestionData } from '../types.ts';
import { targetRepetition } from './repetition.ts';
import { getSpeciesHistory, speciesQuestion } from './species-history.ts';
import { makeTopicQuestion } from './topic-support.ts';
import { getQuestionVariant } from '../variants.ts';
import { gameLevels } from '../level.ts';

it('matches form repetitions across identity formats', () => {
  const level = gameLevels.find((level) =>
    getQuestionVariant('pokemonFromHistoricalSprite', level),
  )!;
  const catalog = {
    pokemon: {
      'Mr. Mime: Mega': { speciesName: 'Mr. Mime' },
      'Mr. Mime': { speciesName: 'Mr. Mime' },
    },
  } as unknown as PokemonCatalog;
  const context = {
    catalog,
    pool: [],
    random: () => 0,
    used: new Set<string>(),
    questionType: 'pokemonFromHistoricalSprite' as const,
    level,
    variant: getQuestionVariant('pokemonFromHistoricalSprite', level)!.variant,
  };
  const topic = makeTopicQuestion(
    context,
    { kind: 'pokemon', name: 'Mr. Mime: Mega', generation: 'I', types: [] },
    'Which one?',
    'Mr. Mime: Mega',
    ['Mr. Mime: Mega', 'A', 'B', 'C'],
  )!;
  const question = {
    ...topic,
    questionType: 'pokemonFromHistoricalSprite',
  } as QuestionData;
  const canonicalTopic = makeTopicQuestion(
    context,
    { kind: 'pokemon', name: 'Mr. Mime', generation: 'I', types: [] },
    'Which one?',
    'Mr. Mime',
    ['Mr. Mime', 'A', 'B', 'C'],
  )!;
  const canonical = {
    ...canonicalTopic,
    questionType: 'pokemonFromHistoricalSprite',
  } as QuestionData;
  const history = rememberQuestion(emptyQuestionHistory(), question);
  const normalized = getSpeciesHistory({ ...context, history })!;
  expect(
    getQuestionRecency(normalized, speciesQuestion(catalog, canonical)),
  ).toBe(1);
  expect(speciesQuestion(catalog, question).repetition.primary).toEqual([
    'Mr. Mime',
  ]);

  const simpleForm = {
    ...question,
    repetition: targetRepetition({ pokemonOptions: false })(question),
  };
  const simpleCanonical = {
    ...canonical,
    repetition: targetRepetition({ pokemonOptions: false })(canonical),
  };
  const simpleHistory = rememberQuestion(emptyQuestionHistory(), simpleForm);
  expect(
    getQuestionRecency(
      getSpeciesHistory({ ...context, history: simpleHistory })!,
      speciesQuestion(catalog, simpleCanonical),
    ),
  ).toBe(1);

  const saved: CompactRound = {
    id: '00000000-0000-4000-8000-000000000003',
    mode: 'daily',
    day: '2026-09-11',
    completedAt: '2026-09-11T12:00:00.000Z',
    answers: Array.from({ length: 5 }, () => ({
      type: 'pokemonFromHistoricalSprite',
      subject: 'Mr. Mime: Mega',
      expected: ['Mr. Mime: Mega'],
      selected: ['Mr. Mime: Mega'],
      responseMs: 1000,
    })),
  };
  expect(
    getQuestionRecency(
      getSpeciesHistory({
        ...context,
        history: recentQuestionHistory([saved]),
      })!,
      speciesQuestion(catalog, canonical),
    ),
  ).toBeGreaterThan(0);
});
