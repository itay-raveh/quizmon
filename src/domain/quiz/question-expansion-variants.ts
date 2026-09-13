import type { DifficultyVariants } from './difficulty';

export interface ExpansionVariantRules {
  namesOnly?: boolean;
  itemChoices?:
    | 'different-categories'
    | 'pocket'
    | 'category'
    | 'medicines'
    | 'stones'
    | 'direct-use';
  combinedCure?: boolean;
  measurementLevel?: 1 | 2 | 3 | 4 | 5;
  reviewedDescription?: boolean;
  fullList?: 'types' | 'regions';
  damageClass?: 'status' | 'any';
  sameMoveType?: boolean;
  unevolvedDistractors?: boolean;
  sameColorOrShape?: boolean;
  evolutionConditions?: 'simple' | 'combined' | 'one-condition';
  effectChoices?: 'broad' | 'related' | 'exact';
  hiddenAbility?: 'ordinary' | 'similar';
  natureChoices?: 'different-raised' | 'shared-stat';
  showEggGroups?: boolean;
  completeEvYield?: boolean;
  encounterConditions?: boolean;
  completeFlavors?: boolean;
}

export const expansionVariants = {
  'item-identification': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'pocket' },
    3: { itemChoices: 'category' },
  },
  'medicine-cabinet': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'medicines' },
    3: { itemChoices: 'medicines', namesOnly: true },
    4: { itemChoices: 'medicines', namesOnly: true, combinedCure: true },
  },
  'evolution-items': {
    1: { itemChoices: 'different-categories' },
    2: { itemChoices: 'stones' },
    3: { itemChoices: 'direct-use' },
    4: { itemChoices: 'direct-use', namesOnly: true },
  },
  'weight-comparison': {
    1: { measurementLevel: 1 },
    2: { measurementLevel: 2 },
    3: { measurementLevel: 3 },
    4: { measurementLevel: 4, namesOnly: true },
    5: { measurementLevel: 5, namesOnly: true },
  },
  'height-comparison': {
    1: { measurementLevel: 1 },
    2: { measurementLevel: 2 },
    3: { measurementLevel: 3 },
    4: { measurementLevel: 4, namesOnly: true },
    5: { measurementLevel: 5, namesOnly: true },
  },
  'move-types': {
    1: { reviewedDescription: true },
    2: {},
    3: { fullList: 'types' },
  },
  'name-that-region': { 2: {}, 3: { fullList: 'regions' } },
  'move-purpose': {
    2: { damageClass: 'status' },
    3: { damageClass: 'any' },
    4: { damageClass: 'any', sameMoveType: true },
  },
  'baby-pokemon': {
    2: {},
    3: { unevolvedDistractors: true },
    4: { unevolvedDistractors: true, namesOnly: true },
  },
  'pokedex-categories': {
    2: {},
    3: { sameColorOrShape: true },
    4: { sameColorOrShape: true, namesOnly: true },
  },
  'evolution-conditions': {
    3: { evolutionConditions: 'simple' },
    4: { evolutionConditions: 'combined' },
    5: { evolutionConditions: 'one-condition', namesOnly: true },
  },
  'ability-effects': {
    3: { effectChoices: 'broad' },
    4: { effectChoices: 'related' },
    5: { effectChoices: 'exact' },
  },
  'held-item-effects': {
    3: { effectChoices: 'broad' },
    4: { effectChoices: 'related' },
    5: { effectChoices: 'exact' },
  },
  'hidden-abilities': {
    4: { hiddenAbility: 'ordinary' },
    5: { hiddenAbility: 'similar', namesOnly: true },
  },
  'nature-effects': {
    4: { natureChoices: 'different-raised' },
    5: { natureChoices: 'shared-stat' },
  },
  'egg-group-connections': {
    4: { showEggGroups: true },
    5: { showEggGroups: false, namesOnly: true },
  },
  'ev-yields': { 4: { completeEvYield: false }, 5: { completeEvYield: true } },
  'encounter-locations': { 4: {}, 5: { encounterConditions: true } },
  'berry-flavors': {
    4: { completeFlavors: false },
    5: { completeFlavors: true },
  },
  'natural-gift': { 5: { fullList: 'types' } },
} satisfies Record<string, DifficultyVariants<ExpansionVariantRules>>;

export type ExpansionQuestionType = keyof typeof expansionVariants;
