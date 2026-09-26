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
  effectKind?: 'bag' | 'held';
  descriptions?: EffectDescription[];
}
interface MoveKnowledge extends TopicEntity {
  descriptions?: Partial<Record<Generation, string>>;
  contexts: {
    game: string;
    generation: Generation;
    type: string;
    damageClass: string;
    machine?: string;
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
interface EffectDescription {
  generation: Generation;
  text: string;
  explanation: string;
}

export interface TopicCatalog {
  items: ItemKnowledge[];
  moves: MoveKnowledge[];
  abilities: (TopicEntity & {
    descriptions?: EffectDescription[];
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
}
