import { getSubjectRecency } from '../question-history.ts';
import type { TopicCatalog } from '../topic-catalog.ts';
import type { QuestionContext } from './context.ts';
import { ordered } from './topic-support.ts';

type Encounter = TopicCatalog['encounters'][number];

const groupEncounters = (
  entries: readonly Encounter[],
  key: (entry: Encounter) => string,
) => {
  const groups = new Map<string, Encounter[]>();
  for (const entry of entries) {
    const name = key(entry);
    const group = groups.get(name);
    if (group) group.push(entry);
    else groups.set(name, [entry]);
  }
  return [...groups.values()];
};

export const orderEncounterLocations = (
  context: QuestionContext,
  entries: readonly Encounter[],
): Encounter[] => {
  const recency = (group: Encounter[]) =>
    Math.max(
      0,
      ...group.map((entry) =>
        context.history
          ? getSubjectRecency(
              context.history,
              'encounter-locations',
              `location/${entry.area}`,
            )
          : 0,
      ),
    );
  const locations = groupEncounters(
    entries,
    (entry) => `${entry.region}/${entry.label.split(' (')[0]}`,
  );
  return ordered(context, locations)
    .map((entries) => ({ entries, seen: recency(entries) }))
    .sort((a, b) => a.seen - b.seen)
    .flatMap(({ entries }) =>
      ordered(
        context,
        groupEncounters(entries, (entry) => entry.area),
      ).flatMap((area) => ordered(context, area)),
    );
};
