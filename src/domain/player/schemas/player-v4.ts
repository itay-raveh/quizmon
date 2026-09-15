import { isRecord } from '../../../lib/validation';
import { isAnswerSubject } from '../../quiz/subject';
import { SaveError, type SaveMigration } from '../save-schema';
import { playerMigrationV5 } from './player-v5';

const migrateSubjectV4 = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const { pokemonName, pokemonTypes, generation, ...current } = value;
  if (
    pokemonName === undefined &&
    pokemonTypes === undefined &&
    generation === undefined
  )
    return value;
  const subject = {
    kind: 'pokemon',
    ...(pokemonName === undefined ? {} : { name: pokemonName }),
    ...(pokemonTypes === undefined ? {} : { types: pokemonTypes }),
    ...(generation === undefined ? {} : { generation }),
  };
  if (
    !isAnswerSubject(subject) ||
    current.subject !== undefined ||
    (pokemonTypes !== undefined &&
      (!Array.isArray(pokemonTypes) ||
        !pokemonTypes.every((type) => typeof type === 'string')))
  )
    throw new SaveError('invalid', 'The saved Pokémon answer is invalid.');
  return { ...current, subject };
};

export const migrateRoundSubjectsV4 = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    ...(Array.isArray(value.questions)
      ? { questions: value.questions.map(migrateSubjectV4) }
      : {}),
    ...(Array.isArray(value.answers)
      ? { answers: value.answers.map(migrateSubjectV4) }
      : {}),
  };
};

const upgradePlayerV4 = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const records = (record: unknown) =>
    isRecord(record)
      ? Object.fromEntries(
          Object.entries(record).map(([key, result]) => [
            key,
            migrateRoundSubjectsV4(result),
          ]),
        )
      : record;
  return {
    ...value,
    leagueLineup: migrateRoundSubjectsV4(value.leagueLineup),
    hallOfFame: Array.isArray(value.hallOfFame)
      ? value.hallOfFame.map((entry: unknown) =>
          isRecord(entry)
            ? { ...entry, result: migrateRoundSubjectsV4(entry.result) }
            : entry,
        )
      : value.hallOfFame,
    results: isRecord(value.results)
      ? {
          ...value.results,
          daily: records(value.results.daily),
          training: records(value.results.training),
        }
      : value.results,
  };
};

export const playerMigrationV4: SaveMigration = {
  parse(value) {
    playerMigrationV5.parse(upgradePlayerV4(value));
    return value;
  },
  upgrade: upgradePlayerV4,
};
