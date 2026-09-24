import type { TopicCatalog } from '../src/domain/quiz/topic-catalog.ts';

export type EditorialTopicCatalog = TopicCatalog & {
  gaps: Record<string, string[]>;
  abilities: (TopicCatalog['abilities'][number] & {
    descriptionSource?: string;
  })[];
  medicineChoices: (TopicCatalog['medicineChoices'][number] & {
    source: string;
  })[];
};
