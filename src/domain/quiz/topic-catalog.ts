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
export const evolutionConditionKinds = [
  'trade',
  'item',
  'held-item',
  'min-level',
  'min-happiness',
  'min-beauty',
  'min-affection',
  'known-move',
  'known-move-type',
  'used-move',
  'min-move-count',
  'min-steps',
  'min-damage-taken',
  'location',
  'region',
  'time-of-day',
  'gender',
  'relative-physical-stats',
  'party-species',
  'party-type',
  'trade-species',
  'allowed-natures',
  'condition',
  'needs-overworld-rain',
  'turn-upside-down',
  'near-special-rock',
  'needs-multiplayer',
] as const;
export type EvolutionCondition = { text: string } & (
  | { kind: 'region'; region: string }
  | { kind: 'time-of-day'; time: 'day' | 'night' | 'dusk' | 'full-moon' }
  | {
      kind: Exclude<
        (typeof evolutionConditionKinds)[number],
        'region' | 'time-of-day'
      >;
    }
);
export interface EvolutionKnowledge {
  before: string;
  after: string;
  game: string;
  generation: Generation;
  trigger: string;
  item?: string;
  conditions: EvolutionCondition[];
  context?: { region: string };
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
  games: Record<
    string,
    { label: string; generation: Generation; regions: string[] }
  >;
  evolutions: EvolutionKnowledge[];
  encounters: EncounterKnowledge[];
}
