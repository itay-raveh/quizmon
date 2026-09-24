import type {
  TopicCatalog,
  EffectKnowledge,
} from '../src/domain/quiz/topic-catalog.ts';

export type EditorialTopicCatalog = TopicCatalog & {
  gaps: Record<string, string[]>;
  abilities: (TopicCatalog['abilities'][number] & {
    descriptionSource?: string;
  })[];
  effects: (EffectKnowledge & { sources: string[] })[];
  medicineChoices: (TopicCatalog['medicineChoices'][number] & {
    source: string;
  })[];
};
