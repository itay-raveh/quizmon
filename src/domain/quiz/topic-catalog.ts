import type { ChoiceDetail } from './types.ts';
import type { Generation, StatName } from '../pokemon/types.ts';

export interface TopicEntity {
  name: string;
  label: string;
  generations: Generation[];
}
interface ItemKnowledge extends TopicEntity {
  sprite: string | null;
  spriteIdentity?: string;
  category: string;
  pocket: string;
}
interface MoveKnowledge extends TopicEntity {
  reviewedDescription?: string;
  contexts: {
    game: string;
    generation: Generation;
    type: string;
    damageClass: string;
  }[];
  type: string;
  damageClass: string;
}
export interface EvolutionKnowledge {
  before: string;
  after: string;
  game: string;
  generation: Generation;
  trigger: string;
  item?: string;
  conditions: string[];
}
interface EncounterKnowledge {
  complete: boolean;
  game: string;
  generation: Generation;
  region: string;
  area: string;
  label: string;
  method: string;
  conditions: string[];
  pokemon: string[];
}
export type EffectMode = 'broad' | 'related' | 'exact';
interface EffectChoice {
  details?: ChoiceDetail[];
  value: string;
  label: string;
}
export interface EffectQuestion {
  prompt?: string;
  supportingText?: string;
  correct: EffectChoice;
  wrong: [EffectChoice, EffectChoice, EffectChoice];
}
export interface EffectKnowledge {
  kind: 'ability' | 'item';
  name: string;
  generation: Generation;
  battleGeneration: Generation;
  context: string;
  sources: string[];
  explanation: string;
  questions: Record<EffectMode, EffectQuestion>;
}

export interface TopicCatalog {
  medicineChoices: {
    name: string;
    cures: string[];
    hp: number | 'full';
    source: string;
  }[];
  effects: EffectKnowledge[];
  items: ItemKnowledge[];
  moves: MoveKnowledge[];
  abilities: (TopicEntity & {
    descriptionSource?: string;
    descriptions?: {
      generation: Generation;
      text: string;
      explanation: string;
    }[];
  })[];
  natures: (TopicEntity & { raised: StatName; lowered: StatName })[];
  berries: (TopicEntity & {
    item: string;
    flavors: Record<string, number>;
    giftType: string;
  })[];
  regions: TopicEntity[];
  locations: (TopicEntity & { region: string })[];
  games: Record<string, { label: string; generation: Generation }>;
  evolutions: EvolutionKnowledge[];
  encounters: EncounterKnowledge[];
  gaps: Record<string, string[]>;
}
