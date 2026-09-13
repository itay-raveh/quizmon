import type { Generation, StatName } from '../pokemon/types';

export interface TopicEntity {
  id: number;
  name: string;
  label: string;
  generations: Generation[];
}
interface ItemKnowledge extends TopicEntity {
  sprite: string | null;
  spriteIdentity?: string;
  category: string;
  pocket: string;
  effect: string;
  descriptions: Record<string, string>;
}
interface MoveKnowledge extends TopicEntity {
  reviewedDescription?: string;
  contexts: {
    game: string;
    generation: Generation;
    type: string;
    damageClass: string;
    description: string;
  }[];
  type: string;
  damageClass: string;
  descriptions: Record<string, string>;
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
export interface TopicCatalog {
  medicines: {
    name: string;
    cures: string[];
    hp: number | 'full';
    source: string;
  }[];
  effects: {
    kind: 'ability' | 'item';
    name: string;
    generation: Generation;
    context: string;
    sources: string[];
    broad: string;
    broadWrong: string[];
    relatedWrong: string[];
    exact: string;
    exactWrong: string[];
  }[];
  items: ItemKnowledge[];
  moves: MoveKnowledge[];
  abilities: (TopicEntity & { effect: string })[];
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
