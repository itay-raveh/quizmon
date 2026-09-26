import type { PokemonCatalog } from '../../pokemon/types.ts';
import {
  emptyQuestionHistory,
  getQuestionRecency,
  rememberQuestion,
} from '../question-history.ts';
import type { QuestionData } from '../types.ts';
import { targetRepetition } from './repetition.ts';
import { getSpeciesHistory, speciesQuestion } from './species-history.ts';
import { makeTopicQuestion } from './topic-support.ts';
import { getStandardQuestionRule } from '../question-variants.ts';

it('matches form repetitions in legacy and structured identities', () => {
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
    questionType: 'pokedex-scan' as const,
    variant: getStandardQuestionRule('pokedex-scan')!,
  };
  const topic = makeTopicQuestion(
    context,
    { kind: 'pokemon', name: 'Mr. Mime: Mega', generation: 'I', types: [] },
    'Which one?',
    'Mr. Mime: Mega',
    ['Mr. Mime: Mega', 'A', 'B', 'C'],
  )!;
  const question = { ...topic, questionType: 'pokedex-scan' } as QuestionData;
  const canonicalTopic = makeTopicQuestion(
    context,
    { kind: 'pokemon', name: 'Mr. Mime', generation: 'I', types: [] },
    'Which one?',
    'Mr. Mime',
    ['Mr. Mime', 'A', 'B', 'C'],
  )!;
  const canonical = {
    ...canonicalTopic,
    questionType: 'pokedex-scan',
  } as QuestionData;
  const history = rememberQuestion(emptyQuestionHistory(), question);
  const normalized = getSpeciesHistory({ ...context, history })!;
  expect(
    getQuestionRecency(normalized, speciesQuestion(catalog, canonical)),
  ).toBe(1);
  expect(speciesQuestion(catalog, question).repetition.primary).toEqual([
    'Mr. Mime',
  ]);

  const legacyForm = {
    ...question,
    repetition: targetRepetition({ pokemonOptions: false })(question),
  };
  const legacyCanonical = {
    ...canonical,
    repetition: targetRepetition({ pokemonOptions: false })(canonical),
  };
  const legacyHistory = rememberQuestion(emptyQuestionHistory(), legacyForm);
  expect(
    getQuestionRecency(
      getSpeciesHistory({ ...context, history: legacyHistory })!,
      speciesQuestion(catalog, legacyCanonical),
    ),
  ).toBe(1);
});
