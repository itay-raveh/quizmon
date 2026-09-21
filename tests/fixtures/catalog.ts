import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assembleTopicCatalog } from '@/domain/quiz/topic-catalog-loading';
const dataPath = resolve('src/domain/pokemon/data');
const catalogData = JSON.parse(
  readFileSync(resolve(dataPath, 'pokemon.json'), 'utf8'),
) as PokemonCatalog & { topicFiles?: string[] };
if (catalogData.topicFiles)
  catalogData.topics = assembleTopicCatalog(
    catalogData.topicFiles.map(
      (file: string) =>
        JSON.parse(readFileSync(resolve(dataPath, file), 'utf8')) as unknown,
    ),
    catalogData.contentVersion,
  );
import type { QuestionContext } from '@/domain/quiz/questions/context';
import { filterPokemon } from '@/domain/settings/game-settings';
import { createSeededRandom } from '@/lib/random';
import {
  generations,
  type Generation,
  type PokemonCatalog,
} from '../../src/domain/pokemon/types';

delete catalogData.topicFiles;
export const catalog = catalogData as unknown as PokemonCatalog;

export const createQuestionContext = (
  seed: string,
  selected: readonly Generation[] = generations,
): QuestionContext => ({
  catalog,
  generations: [...selected],
  pool: filterPokemon(catalog, { generations: [...selected] }),
  random: createSeededRandom(seed),
  used: new Set<string>(),
});
