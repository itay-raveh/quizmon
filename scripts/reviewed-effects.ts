import type { EffectKnowledge } from '../src/domain/quiz/topic-catalog.ts';

const preventsSleep = {
  value: 'Prevents the holder from falling asleep.',
  label: 'Prevents sleep',
};
const contactDamage = {
  value: 'Damages attackers that make contact.',
  label: 'Damages attackers on contact',
};
const attackMoveLock = {
  value: 'Boosts Attack while restricting the holder to one move.',
  label: 'Boosts Attack but locks the holder into one move',
};
const surviveAtOneHp = {
  value: 'At full HP, is consumed to survive a lethal move hit with 1 HP.',
  label: 'Used up to survive a hit at 1 HP, if starting at full HP',
};
const poisonHealTradeoff = {
  value: 'Heals a Poison-type holder each turn but damages other types.',
  label: 'Each turn: heals Poison types, damages other types',
};
const electricAbsorb = {
  value: 'Electric-type moves heal the holder instead of affecting it.',
  label: 'Blocks Electric moves and restores HP',
};
const contactRetaliation = {
  value: 'Damages an attacker when its move makes contact with the holder.',
  label: 'Damages attackers on contact',
};
const healingBoost = {
  value:
    'Increases healing from draining moves and certain ongoing recovery effects.',
  label: 'Boosts draining moves and some ongoing healing',
};
const grassAttackBoost = {
  value: 'Grass-type moves raise Attack instead of affecting the holder.',
  label: 'Blocks Grass moves and raises Attack',
};

export const reviewedEffects: (EffectKnowledge & { sources: string[] })[] = [
  {
    kind: 'ability',
    name: 'volt-absorb',
    generation: 'III',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; the ability is active and no effect bypasses it',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/abilities.ts#L5340-L5349',
    ],
    explanation:
      'An Electric-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
    questions: {
      broad: {
        correct: electricAbsorb,
        wrong: [
          {
            value: 'Raises the holder’s physical Attack when it enters battle.',
            label: 'Raises Attack on entering battle',
          },
          preventsSleep,
          contactDamage,
        ],
      },
      related: {
        correct: electricAbsorb,
        wrong: [
          {
            value: 'Water-type moves heal the holder instead of affecting it.',
            label: 'Blocks Water moves and restores HP',
          },
          {
            value:
              'Electric-type moves raise Speed instead of affecting the holder.',
            label: 'Blocks Electric moves and raises Speed',
          },
          {
            value:
              'Electric-type moves raise Special Attack instead of affecting the holder.',
            label: 'Blocks Electric moves and raises Special Attack',
          },
        ],
      },
      exact: {
        prompt: 'Which incoming Electric moves activate Volt Absorb?',
        supportingText: 'Restores up to 1/4 of maximum HP',
        correct: {
          value:
            'An Electric-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
          label: 'Physical, special, and status',
        },
        wrong: [
          {
            value:
              'Only physical Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Physical only',
          },
          {
            value:
              'Only special Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Special only',
          },
          {
            value:
              'Only status Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Status only',
          },
        ],
      },
    },
  },
  {
    kind: 'item',
    name: 'leftovers',
    generation: 'II',
    battleGeneration: 'IX',
    context: 'Generation IX battles; held-item effects and healing are active',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/items.ts#L3338-L3350',
    ],
    explanation:
      'At the end of each turn, restores up to 1/16 of the holder’s maximum HP, regardless of its type.',
    questions: {
      broad: {
        correct: {
          value: 'Restores some of the holder’s HP at the end of each turn.',
          label: 'Restores HP each turn',
        },
        wrong: [attackMoveLock, surviveAtOneHp, contactRetaliation],
      },
      related: {
        correct: {
          value: 'Restores some of the holder’s HP at the end of each turn.',
          label: 'Restores HP each turn',
        },
        wrong: [
          poisonHealTradeoff,
          {
            value: 'Restores HP based on damage the holder dealt with a move.',
            label: 'Restores HP based on damage dealt',
          },
          healingBoost,
        ],
      },
      exact: {
        prompt: 'How much HP does Leftovers restore each turn?',
        supportingText: 'Recovery uses maximum HP',
        correct: {
          value:
            'At the end of each turn, restores up to 1/16 of the holder’s maximum HP, regardless of its type.',
          label: '1/16 HP',
          details: [{ value: '+1/16 HP', label: 'Each turn' }],
        },
        wrong: [
          {
            value:
              'At the end of each turn, restores up to 1/8 of the holder’s maximum HP, regardless of its type.',
            label: '1/8 HP',
            details: [{ value: '+1/8 HP', label: 'Each turn' }],
          },
          {
            value:
              'At the end of each turn, restores up to 1/4 of the holder’s maximum HP, regardless of its type.',
            label: '1/4 HP',
            details: [{ value: '+1/4 HP', label: 'Each turn' }],
          },
          {
            value:
              'At the end of each turn, restores up to 1/16 of maximum HP only if the holder is Poison type.',
            label: '1/16 HP · Poison types only',
            details: [{ value: '+1/16 HP', label: 'Poison types only' }],
          },
        ],
      },
    },
  },
  {
    kind: 'ability',
    name: 'earth-eater',
    generation: 'IX',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; the ability is active and no effect bypasses it',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/abilities.ts#L1133-L1142',
    ],
    explanation:
      'A Ground-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
    questions: {
      broad: {
        correct: {
          value: 'Ground-type moves heal the holder instead of affecting it.',
          label: 'Blocks Ground moves and restores HP',
        },
        wrong: [
          preventsSleep,
          {
            value: 'Raises Attack after knocking out another Pokémon.',
            label: 'Raises Attack after a knockout',
          },
          contactDamage,
        ],
      },
      related: {
        correct: {
          value: 'Ground-type moves heal the holder instead of affecting it.',
          label: 'Blocks Ground moves and restores HP',
        },
        wrong: [
          electricAbsorb,
          {
            value: 'Water-type moves heal the holder instead of affecting it.',
            label: 'Blocks Water moves and restores HP',
          },
          grassAttackBoost,
        ],
      },
      exact: {
        prompt: 'Which incoming Ground moves activate Earth Eater?',
        supportingText: 'Restores up to 1/4 of maximum HP',
        correct: {
          value:
            'A Ground-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
          label: 'Physical, special, and status',
        },
        wrong: [
          {
            value:
              'Only physical Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Physical only',
          },
          {
            value:
              'Only special Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Special only',
          },
          {
            value:
              'Only status Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.',
            label: 'Status only',
          },
        ],
      },
    },
  },
  {
    kind: 'ability',
    name: 'sap-sipper',
    generation: 'V',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; another Pokémon targets the holder, with its ability active and no bypass',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/abilities.ts#L4023-L4038',
    ],
    explanation:
      'A Grass-type move raises Attack by one stage, including status moves.',
    questions: {
      broad: {
        correct: grassAttackBoost,
        wrong: [
          preventsSleep,
          {
            value: 'Heals the holder at the end of each turn.',
            label: 'Restores HP each turn',
          },
          contactDamage,
        ],
      },
      related: {
        correct: grassAttackBoost,
        wrong: [
          {
            value:
              'Water-type moves raise Special Attack instead of affecting the holder.',
            label: 'Blocks Water moves and raises Special Attack',
          },
          {
            value:
              'Electric-type moves raise Speed instead of affecting the holder.',
            label: 'Blocks Electric moves and raises Speed',
          },
          {
            value:
              'Grass-type moves restore HP instead of affecting the holder.',
            label: 'Blocks Grass moves and restores HP',
          },
        ],
      },
      exact: {
        prompt: 'Which incoming Grass moves activate Sap Sipper?',
        supportingText: 'Raises Attack by one stage',
        correct: {
          value:
            'A Grass-type move raises Attack by one stage, including status moves.',
          label: 'Physical, special, and status',
        },
        wrong: [
          {
            value: 'Only physical Grass-type moves raise Attack by one stage.',
            label: 'Physical only',
          },
          {
            value: 'Only special Grass-type moves raise Attack by one stage.',
            label: 'Special only',
          },
          {
            value: 'Only status Grass-type moves raise Attack by one stage.',
            label: 'Status only',
          },
        ],
      },
    },
  },
  {
    kind: 'ability',
    name: 'water-compaction',
    generation: 'VII',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; the holder survives the hit and its ability is active',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/abilities.ts#L5418-L5426',
    ],
    explanation:
      'A damaging Water-type hit raises Defense by two stages, whether physical or special.',
    questions: {
      broad: {
        supportingText: 'Holder survives the hit',
        correct: {
          value:
            'A damaging Water-type hit raises the holder’s Defense. Damage still applies.',
          label: 'Water hits deal damage and raise Defense',
        },
        wrong: [
          preventsSleep,
          {
            value: 'Heals the holder when it switches out.',
            label: 'Restores HP when switching out',
          },
          contactDamage,
        ],
      },
      related: {
        supportingText: 'Holder survives the hit',
        correct: {
          value:
            'A damaging Water-type hit raises the holder’s Defense. Damage still applies.',
          label: 'Water hits deal damage and raise Defense',
        },
        wrong: [
          {
            value:
              'Water-type moves restore HP instead of affecting the holder.',
            label: 'Blocks Water moves and restores HP',
          },
          {
            value:
              'Water-type moves raise Special Attack instead of affecting the holder.',
            label: 'Blocks Water moves and raises Special Attack',
          },
          {
            value:
              'A damaging Water-type hit lowers the holder’s Defense. Damage still applies.',
            label: 'Water hits deal damage and lower Defense',
          },
        ],
      },
      exact: {
        prompt: 'Which incoming Water moves activate Water Compaction?',
        supportingText:
          'Holder survives the hit · Raises Defense by two stages',
        correct: {
          value:
            'A damaging Water-type hit raises Defense by two stages, whether physical or special.',
          label: 'Physical and special',
        },
        wrong: [
          {
            value: 'Only physical Water-type hits raise Defense by two stages.',
            label: 'Physical only',
          },
          {
            value: 'Only special Water-type hits raise Defense by two stages.',
            label: 'Special only',
          },
          {
            value:
              'Only non-damaging Water-type moves raise Defense by two stages.',
            label: 'Status only',
          },
        ],
      },
    },
  },
  {
    kind: 'item',
    name: 'black-sludge',
    generation: 'IV',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; held-item effects, healing and item damage are active',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/items.ts#L538-L555',
    ],
    explanation:
      'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.',
    questions: {
      broad: {
        correct: poisonHealTradeoff,
        wrong: [attackMoveLock, surviveAtOneHp, contactRetaliation],
      },
      related: {
        correct: poisonHealTradeoff,
        wrong: [
          {
            value: 'Heals holders of every type at the end of each turn.',
            label: 'Heals every type of holder each turn',
          },
          {
            value: 'Restores HP based on damage the holder dealt with a move.',
            label: 'Restores HP based on damage dealt',
          },
          healingBoost,
        ],
      },
      exact: {
        prompt: 'How does Black Sludge change HP each turn?',
        supportingText: 'Amounts use maximum HP',
        correct: {
          value:
            'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.',
          label: 'Poison: +1/16 HP\nOther types: −1/8 HP',
          details: [
            { value: '+1/16 HP', label: 'Poison types' },
            { value: '−1/8 HP', label: 'Other types' },
          ],
        },
        wrong: [
          {
            value:
              'Each turn, restores up to 1/8 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.',
            label: 'Poison: +1/8 HP\nOther types: −1/8 HP',
            details: [
              { value: '+1/8 HP', label: 'Poison types' },
              { value: '−1/8 HP', label: 'Other types' },
            ],
          },
          {
            value:
              'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/16 maximum HP.',
            label: 'Poison: +1/16 HP\nOther types: −1/16 HP',
            details: [
              { value: '+1/16 HP', label: 'Poison types' },
              { value: '−1/16 HP', label: 'Other types' },
            ],
          },
          {
            value:
              'Each turn, restores up to 1/16 maximum HP to every type of holder.',
            label: 'All types: +1/16 HP',
            details: [{ value: '+1/16 HP', label: 'All types' }],
          },
        ],
      },
    },
  },
  {
    kind: 'item',
    name: 'shell-bell',
    generation: 'III',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; the holder stays in battle after its attack and healing is active',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/items.ts#L5650-L5663',
    ],
    explanation:
      'After a damaging move, restores up to 1/8 of the damage dealt, with a minimum of 1 HP when healing succeeds.',
    questions: {
      broad: {
        supportingText: 'User remains in battle',
        correct: {
          value: 'Restores HP based on damage dealt by the holder’s move.',
          label: 'Restores HP based on damage dealt',
        },
        wrong: [attackMoveLock, surviveAtOneHp, contactRetaliation],
      },
      related: {
        supportingText: 'User remains in battle',
        correct: {
          value: 'Restores HP based on damage dealt by the holder’s move.',
          label: 'Restores HP based on damage dealt',
        },
        wrong: [
          {
            value:
              'Restores HP at the end of every turn without requiring an attack.',
            label: 'Restores HP each turn, without attacking',
          },
          poisonHealTradeoff,
          healingBoost,
        ],
      },
      exact: {
        prompt: 'How does Shell Bell restore HP?',
        supportingText: 'User remains in battle',
        correct: {
          value:
            'After a damaging move, restores up to 1/8 of the damage dealt, with a minimum of 1 HP when healing succeeds.',
          label: 'After attacking: 1/8 of damage dealt (at least 1 HP)',
          details: [
            {
              value: '+1/8 damage dealt',
              label: 'After attacking · min. 1 HP',
            },
          ],
        },
        wrong: [
          {
            value:
              'After a damaging move, restores up to 1/8 of the holder’s maximum HP.',
            label: 'After attacking: 1/8 of maximum HP',
            details: [{ value: '+1/8 max HP', label: 'After attacking' }],
          },
          {
            value:
              'After a damaging move, restores up to 1/4 of the damage dealt.',
            label: 'After attacking: 1/4 of damage dealt',
            details: [{ value: '+1/4 damage dealt', label: 'After attacking' }],
          },
          {
            value:
              'At the end of every turn, restores up to 1/8 of the holder’s maximum HP.',
            label: 'Each turn: 1/8 of maximum HP',
            details: [{ value: '+1/8 max HP', label: 'Each turn' }],
          },
        ],
      },
    },
  },
  {
    kind: 'item',
    name: 'rocky-helmet',
    generation: 'V',
    battleGeneration: 'IX',
    context:
      'Generation IX battles; contact-triggered item effects and damage are active',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/a5df8274e85b0889bf2a9b3422a08b39732374fc/data/items.ts#L5295-L5307',
    ],
    explanation:
      'After a damaging contact hit, the attacker loses 1/6 of its maximum HP.',
    questions: {
      broad: {
        correct: {
          value:
            'Damages an attacker after its damaging move makes contact with the holder.',
          label: 'Damages attackers after damaging contact hits',
        },
        wrong: [
          attackMoveLock,
          {
            value: 'Restores HP at the end of every turn.',
            label: 'Restores HP each turn',
          },
          surviveAtOneHp,
        ],
      },
      related: {
        correct: {
          value:
            'Damages an attacker after its damaging move makes contact with the holder.',
          label: 'Damages attackers after damaging contact hits',
        },
        wrong: [
          {
            value: 'Damages the holder at the end of each turn.',
            label: 'Damages the holder each turn',
          },
          {
            value:
              'Damages attackers after any damaging move, even without contact.',
            label: 'Damages attackers after any damaging hit',
          },
          {
            value: 'Damages attackers only after non-damaging moves.',
            label: 'Damages attackers only after status moves',
          },
        ],
      },
      exact: {
        prompt: 'How does Rocky Helmet damage the attacker?',
        supportingText: 'Attacker’s max HP',
        correct: {
          value:
            'After a damaging contact hit, the attacker loses 1/6 of its maximum HP.',
          label: 'Contact hit: loses 1/6 HP',
          details: [{ value: '−1/6 HP', label: 'Contact hit' }],
        },
        wrong: [
          {
            value:
              'After a damaging contact hit, the attacker loses 1/8 of its maximum HP.',
            label: 'Contact hit: loses 1/8 HP',
            details: [{ value: '−1/8 HP', label: 'Contact hit' }],
          },
          {
            value:
              'After a damaging contact hit, the attacker loses 1/4 of its maximum HP.',
            label: 'Contact hit: loses 1/4 HP',
            details: [{ value: '−1/4 HP', label: 'Contact hit' }],
          },
          {
            value:
              'After any damaging hit, including without contact, the attacker loses 1/6 of its maximum HP.',
            label: 'Any damaging hit: loses 1/6 HP',
            details: [{ value: '−1/6 HP', label: 'Any damaging hit' }],
          },
        ],
      },
    },
  },
];

interface AbilityReview {
  name: string;
  generation: EffectKnowledge['generation'];
  broad: string;
  related: [string, string, string];
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  support: string;
}
const contactRelated: AbilityReview['related'] = [
  'Damages attackers after every damaging hit',
  'Damages attackers only after non-contact hits',
  'Damages the holder after it attacks',
];
const contactWrong: AbilityReview['wrong'] = [
  '¹⁄₁₆ of the attacker’s maximum HP',
  '¼ of the attacker’s maximum HP',
  '⅛ of the holder’s maximum HP',
];
const multiplierWrong: AbilityReview['wrong'] = ['×1.5', '×3', '×4'];
const statusRelated: AbilityReview['related'] = [
  'Prevents and cures sleep',
  'Prevents and cures paralysis',
  'Prevents and cures poison',
];
const statusWrongTail = [
  'It loses ¼ maximum HP',
  'Its Speed rises by one stage',
] as const;
const abilityReviews: AbilityReview[] = [
  {
    name: 'water-absorb',
    generation: 'III',
    broad: 'Blocks Water moves and restores HP',
    related: [
      'Blocks Water moves and raises Attack',
      'Blocks Electric moves and restores HP',
      'Water hits raise Defense but still deal damage',
    ],
    prompt: 'Which incoming Water moves activate Water Absorb?',
    correct: 'Physical, special, and status',
    wrong: ['Physical only', 'Special only', 'Status only'],
    support: 'Moves from another Pokémon · Restores up to ¼ maximum HP',
  },
  {
    name: 'intimidate',
    generation: 'III',
    broad: 'Lowers nearby opponents’ Attack on entry',
    related: [
      'Lowers nearby opponents’ Defense on entry',
      'Raises the holder’s Attack on entry',
      'Lowers nearby opponents’ Speed on entry',
    ],
    prompt: 'How does Intimidate change an affected opponent’s stats?',
    correct: 'Attack ↓ 1 stage',
    wrong: [
      'Attack ↓ 2 stages',
      'Defense ↓ 1 stage',
      'Special Attack ↓ 1 stage',
    ],
    support: 'On entry · No Substitute or effect prevents the drop',
  },
  {
    name: 'moxie',
    generation: 'V',
    broad: 'Raises Attack after knocking out a Pokémon with a move',
    related: [
      'Raises Speed after a knockout',
      'Raises Special Attack after a knockout',
      'Raises Attack when taking damage',
    ],
    prompt: 'How much Attack does Moxie grant per Pokémon knocked out?',
    correct: '↑ 1 stage',
    wrong: ['↑ 2 stages', '↑ 3 stages', '↑ 6 stages'],
    support: 'Knockout caused by the holder’s move',
  },
  {
    name: 'regenerator',
    generation: 'V',
    broad: 'Restores HP when switching out',
    related: [
      'Restores HP when switching in',
      'Restores HP each turn',
      'Cures status when switching out',
    ],
    prompt: 'How much HP does Regenerator restore when switching out?',
    correct: '⅓ maximum HP',
    wrong: ['¼ maximum HP', '½ maximum HP', '⅛ maximum HP'],
    support: 'Up to the holder’s missing HP',
  },
  {
    name: 'natural-cure',
    generation: 'III',
    broad: 'Cures the holder’s status condition when switching out',
    related: [
      'Restores HP when switching out',
      'Cures status when switching in',
      'Cures status after every turn',
    ],
    prompt: 'When does Natural Cure clear a status condition?',
    correct: 'When switching out',
    wrong: [
      'When switching in',
      'At the end of each turn',
      'After taking a hit',
    ],
    support: '',
  },
  {
    name: 'poison-heal',
    generation: 'IV',
    broad: 'Poison restores HP instead of dealing poison damage',
    related: [
      'Poison raises Attack instead of dealing poison damage',
      'Burn restores HP instead of dealing burn damage',
      'Poison is cured immediately',
    ],
    prompt: 'How much HP does Poison Heal restore each turn while poisoned?',
    correct: '⅛ maximum HP',
    wrong: ['¹⁄₁₆ maximum HP', '¼ maximum HP', '⅓ maximum HP'],
    support: 'Ordinary or bad poison · Healing is available',
  },
  {
    name: 'rough-skin',
    generation: 'III',
    broad: 'Damages attackers after damaging contact hits',
    related: contactRelated,
    prompt: 'How much HP does Rough Skin remove from a contact attacker?',
    correct: '⅛ of the attacker’s maximum HP',
    wrong: contactWrong,
    support: 'Damaging contact hit · Contact effects are not blocked',
  },
  {
    name: 'iron-barbs',
    generation: 'V',
    broad: 'Damages attackers after damaging contact hits',
    related: contactRelated,
    prompt: 'How much HP does Iron Barbs remove from a contact attacker?',
    correct: '⅛ of the attacker’s maximum HP',
    wrong: contactWrong,
    support: 'Damaging contact hit · Contact effects are not blocked',
  },
  {
    name: 'thick-fat',
    generation: 'III',
    broad: 'Reduces damage from Fire and Ice attacks',
    related: [
      'Reduces damage from Water and Ice attacks',
      'Blocks Fire and Ice attacks completely',
      'Reduces damage from Fire and Electric attacks',
    ],
    prompt: 'How does Thick Fat modify the attacker’s relevant attacking stat?',
    correct: '×½',
    wrong: ['×¼', '×¾', '×2'],
    support: 'Incoming Fire or Ice attack · Physical or special',
  },
  {
    name: 'huge-power',
    generation: 'III',
    broad: 'Doubles the holder’s Attack',
    related: [
      'Doubles the holder’s Special Attack',
      'Doubles the holder’s Speed',
      'Raises Attack only after a knockout',
    ],
    prompt: 'What Attack multiplier does Huge Power apply?',
    correct: '×2',
    wrong: multiplierWrong,
    support: '',
  },
  {
    name: 'pure-power',
    generation: 'III',
    broad: 'Doubles the holder’s Attack',
    related: [
      'Doubles the holder’s Special Attack',
      'Doubles the holder’s Speed',
      'Raises Attack only after a knockout',
    ],
    prompt: 'What Attack multiplier does Pure Power apply?',
    correct: '×2',
    wrong: multiplierWrong,
    support: '',
  },
  {
    name: 'chlorophyll',
    generation: 'III',
    broad: 'Boosts Speed during harsh sunlight',
    related: [
      'Boosts Speed during rain',
      'Boosts Speed during a sandstorm',
      'Boosts Speed during snow',
    ],
    prompt: 'How much does Chlorophyll multiply Speed during harsh sunlight?',
    correct: '×2',
    wrong: multiplierWrong,
    support: 'Weather effects are active',
  },
  {
    name: 'swift-swim',
    generation: 'III',
    broad: 'Boosts Speed during rain',
    related: [
      'Boosts Speed during harsh sunlight',
      'Boosts Speed during a sandstorm',
      'Boosts Speed during snow',
    ],
    prompt: 'How much does Swift Swim multiply Speed during rain?',
    correct: '×2',
    wrong: multiplierWrong,
    support: 'Weather effects are active',
  },
  {
    name: 'sand-rush',
    generation: 'V',
    broad: 'Boosts Speed during a sandstorm',
    related: [
      'Boosts Speed during harsh sunlight',
      'Boosts Speed during rain',
      'Boosts Speed during snow',
    ],
    prompt: 'How much does Sand Rush multiply Speed during a sandstorm?',
    correct: '×2',
    wrong: multiplierWrong,
    support: 'Weather effects are active',
  },
  {
    name: 'slush-rush',
    generation: 'VII',
    broad: 'Boosts Speed during snow',
    related: [
      'Boosts Speed during harsh sunlight',
      'Boosts Speed during rain',
      'Boosts Speed during a sandstorm',
    ],
    prompt: 'How much does Slush Rush multiply Speed during snow?',
    correct: '×2',
    wrong: multiplierWrong,
    support: 'Weather effects are active',
  },
  {
    name: 'insomnia',
    generation: 'III',
    broad: 'Prevents and cures sleep',
    related: [
      'Prevents and cures paralysis',
      'Prevents and cures poison',
      'Prevents and cures burn',
    ],
    prompt: 'What happens if a Pokémon gains Insomnia while affected by sleep?',
    correct: 'The sleep condition is cured',
    wrong: ['The sleep condition remains', ...statusWrongTail],
    support: 'Ability is active',
  },
  {
    name: 'limber',
    generation: 'III',
    broad: 'Prevents and cures paralysis',
    related: [
      'Prevents and cures sleep',
      'Prevents and cures poison',
      'Prevents and cures burn',
    ],
    prompt:
      'What happens if a Pokémon gains Limber while affected by paralysis?',
    correct: 'The paralysis condition is cured',
    wrong: ['The paralysis condition remains', ...statusWrongTail],
    support: 'Ability is active',
  },
  {
    name: 'immunity',
    generation: 'III',
    broad: 'Prevents and cures poison',
    related: [
      'Prevents and cures sleep',
      'Prevents and cures paralysis',
      'Prevents and cures burn',
    ],
    prompt:
      'What happens if a Pokémon gains Immunity while affected by poison?',
    correct: 'The poison condition is cured',
    wrong: ['The poison condition remains', ...statusWrongTail],
    support: 'Ability is active',
  },
  {
    name: 'water-veil',
    generation: 'III',
    broad: 'Prevents and cures burn',
    related: statusRelated,
    prompt:
      'What happens if a Pokémon gains Water Veil while affected by burn?',
    correct: 'The burn condition is cured',
    wrong: ['The burn condition remains', ...statusWrongTail],
    support: 'Ability is active',
  },
  {
    name: 'magma-armor',
    generation: 'III',
    broad: 'Prevents and cures freeze',
    related: statusRelated,
    prompt:
      'What happens if a Pokémon gains Magma Armor while affected by freeze?',
    correct: 'The freeze condition is cured',
    wrong: ['The freeze condition remains', ...statusWrongTail],
    support: 'Ability is active',
  },
];
const choice = (value: string) => ({ value, label: value });
const choices = (
  values: [string, string, string],
): [
  ReturnType<typeof choice>,
  ReturnType<typeof choice>,
  ReturnType<typeof choice>,
] => [choice(values[0]), choice(values[1]), choice(values[2])];
for (const review of abilityReviews) {
  reviewedEffects.push({
    kind: 'ability',
    name: review.name,
    generation: review.generation,
    battleGeneration: 'IX',
    context:
      'Generation IX battles; the ability is active and no effect bypasses or prevents it',
    sources: [
      'https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts',
      'https://github.com/smogon/pokemon-showdown/blob/master/data/text/abilities.ts',
    ],
    explanation: `${review.broad}. ${review.prompt} ${review.correct}.`,
    questions: {
      broad: {
        correct: choice(review.broad),
        wrong: choices([
          'Summons rain when entering battle',
          'Reflects incoming status moves',
          'Turns Normal moves into Flying moves',
        ]),
      },
      related: {
        correct: choice(review.broad),
        wrong: choices(review.related),
      },
      exact: {
        prompt: review.prompt,
        ...(review.support ? { supportingText: review.support } : {}),
        correct: choice(review.correct),
        wrong: choices(review.wrong),
      },
    },
  });
}
