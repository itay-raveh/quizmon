import type { PokemonCatalog } from '../../pokemon/types.ts';
import {
  emptyQuestionHistory,
  getQuestionRecency,
  rememberQuestion,
} from '../history.ts';
import type { QuestionData } from '../types.ts';
import { targetRepetition } from './repetition.ts';
import { getSpeciesHistory, speciesQuestion } from './species-history.ts';
import { makeTopicQuestion } from './topic-support.ts';
import { getUnleveledQuestionRule } from '../variants.ts';

it('matches form repetitions across identity formats', () => {
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
    variant: getUnleveledQuestionRule('pokemonFromHistoricalSprite')!,
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
});
