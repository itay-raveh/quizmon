import { formatPokemonName } from '../../pokemon/format';
import type { QuestionData } from '../types';
import type { TopicCatalog } from '../topic-catalog';

// Option text is a persisted answer key, so only its display label is shortened.
const labels: Record<string, string> = {
  'A damaging Water-type hit lowers the holder’s Defense. Damage still applies.':
    'Water hits deal damage and lower Defense',
  'A damaging Water-type hit raises the holder’s Defense. Damage still applies.':
    'Water hits deal damage and raise Defense',
  'At full HP, is consumed to survive a lethal move hit with 1 HP.':
    'Used up to survive a hit at 1 HP, if starting at full HP',
  'Boosts Attack while restricting the holder to one move.':
    'Boosts Attack but locks the holder into one move',
  'Damages an attacker after its damaging move makes contact with the holder.':
    'Damages attackers after damaging contact hits',
  'Damages an attacker when its move makes contact with the holder.':
    'Damages attackers on contact',
  'Damages attackers after any damaging move, even without contact.':
    'Damages attackers after any damaging hit',
  'Damages attackers only after non-damaging moves.':
    'Damages attackers only after status moves',
  'Damages attackers that make contact.': 'Damages attackers on contact',
  'Damages the holder at the end of each turn.': 'Damages the holder each turn',
  'Heals a Poison-type holder each turn but damages other types.':
    'Each turn: heals Poison types, damages other types',
  'Heals holders of every type at the end of each turn.':
    'Heals every type of holder each turn',
  'Heals the holder at the end of each turn.': 'Restores HP each turn',
  'Heals the holder when it switches out.': 'Restores HP when switching out',
  'Increases healing from draining moves and certain ongoing recovery effects.':
    'Boosts draining moves and some ongoing healing',
  'Prevents the holder from falling asleep.': 'Prevents sleep',
  'Raises Attack after knocking out another Pokémon.':
    'Raises Attack after a knockout',
  'Raises the holder’s physical Attack when it enters battle.':
    'Raises Attack on entering battle',
  'Restores HP at the end of every turn without requiring an attack.':
    'Restores HP each turn, without attacking',
  'Restores HP at the end of every turn.': 'Restores HP each turn',
  'Restores HP based on damage dealt by the holder’s move.':
    'Restores HP based on damage dealt',
  'Restores HP based on damage the holder dealt with a move.':
    'Restores HP based on damage dealt',
  'Restores some of the holder’s HP at the end of each turn.':
    'Restores HP each turn',
  'Electric-type moves heal the holder instead of affecting it.':
    'Blocks Electric moves and restores HP',
  'Water-type moves heal the holder instead of affecting it.':
    'Blocks Water moves and restores HP',
  'Ground-type moves heal the holder instead of affecting it.':
    'Blocks Ground moves and restores HP',
  'Grass-type moves restore HP instead of affecting the holder.':
    'Blocks Grass moves and restores HP',
  'Water-type moves restore HP instead of affecting the holder.':
    'Blocks Water moves and restores HP',
  'Electric-type moves raise Speed instead of affecting the holder.':
    'Blocks Electric moves and raises Speed',
  'Electric-type moves raise Special Attack instead of affecting the holder.':
    'Blocks Electric moves and raises Special Attack',
  'Grass-type moves raise Attack instead of affecting the holder.':
    'Blocks Grass moves and raises Attack',
  'Water-type moves raise Special Attack instead of affecting the holder.':
    'Blocks Water moves and raises Special Attack',
  'An Electric-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.':
    'Physical, special, and status',
  'Only physical Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Physical only',
  'Only special Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Special only',
  'Only status Electric-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Status only',
  'At the end of each turn, restores up to 1/16 of the holder’s maximum HP, regardless of its type.':
    '1/16 HP',
  'At the end of each turn, restores up to 1/8 of the holder’s maximum HP, regardless of its type.':
    '1/8 HP',
  'At the end of each turn, restores up to 1/4 of the holder’s maximum HP, regardless of its type.':
    '1/4 HP',
  'At the end of each turn, restores up to 1/16 of maximum HP only if the holder is Poison type.':
    '1/16 HP · Poison types only',
  'A Ground-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.':
    'Physical, special, and status',
  'Only physical Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Physical only',
  'Only special Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Special only',
  'Only status Ground-type moves from another Pokémon restore up to 1/4 of maximum HP.':
    'Status only',
  'A Grass-type move raises Attack by one stage, including status moves.':
    'Physical, special, and status',
  'Only physical Grass-type moves raise Attack by one stage.': 'Physical only',
  'Only special Grass-type moves raise Attack by one stage.': 'Special only',
  'Only status Grass-type moves raise Attack by one stage.': 'Status only',
  'A damaging Water-type hit raises Defense by two stages, whether physical or special.':
    'Physical and special',
  'Only physical Water-type hits raise Defense by two stages.': 'Physical only',
  'Only special Water-type hits raise Defense by two stages.': 'Special only',
  'Only non-damaging Water-type moves raise Defense by two stages.':
    'Status only',
  'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.':
    'Poison: +1/16 HP\nOther types: −1/8 HP',
  'Each turn, restores up to 1/8 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.':
    'Poison: +1/8 HP\nOther types: −1/8 HP',
  'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/16 maximum HP.':
    'Poison: +1/16 HP\nOther types: −1/16 HP',
  'Each turn, restores up to 1/16 maximum HP to every type of holder.':
    'All types: +1/16 HP',
  'After a damaging move, restores up to 1/8 of the damage dealt, with a minimum of 1 HP when healing succeeds.':
    'After attacking: 1/8 of damage dealt (at least 1 HP)',
  'After a damaging move, restores up to 1/8 of the holder’s maximum HP.':
    'After attacking: 1/8 of maximum HP',
  'After a damaging move, restores up to 1/4 of the damage dealt.':
    'After attacking: 1/4 of damage dealt',
  'At the end of every turn, restores up to 1/8 of the holder’s maximum HP.':
    'Each turn: 1/8 of maximum HP',
  'After a damaging contact hit, the attacker loses 1/6 of its maximum HP.':
    'Contact hit: loses 1/6 HP',
  'After a damaging contact hit, the attacker loses 1/8 of its maximum HP.':
    'Contact hit: loses 1/8 HP',
  'After a damaging contact hit, the attacker loses 1/4 of its maximum HP.':
    'Contact hit: loses 1/4 HP',
  'After any damaging hit, including without contact, the attacker loses 1/6 of its maximum HP.':
    'Any damaging hit: loses 1/6 HP',
};

const exactPrompts: Record<string, { text: string; supportingText: string }> = {
  leftovers: {
    text: 'How much HP does Leftovers restore each turn?',
    supportingText: 'Recovery uses maximum HP',
  },
  'black-sludge': {
    text: 'How does Black Sludge change HP each turn?',
    supportingText: 'Amounts use maximum HP',
  },
  'shell-bell': {
    text: 'How does Shell Bell restore HP?',
    supportingText: 'User remains in battle',
  },
  'rocky-helmet': {
    text: 'How does Rocky Helmet damage the attacker?',
    supportingText: 'Damage uses the attacker’s maximum HP',
  },
  'volt-absorb': {
    text: 'Which incoming Electric moves activate Volt Absorb?',
    supportingText: 'Restores up to 1/4 of maximum HP',
  },
  'earth-eater': {
    text: 'Which incoming Ground moves activate Earth Eater?',
    supportingText: 'Restores up to 1/4 of maximum HP',
  },
  'sap-sipper': {
    text: 'Which incoming Grass moves activate Sap Sipper?',
    supportingText: 'Raises Attack by one stage',
  },
  'water-compaction': {
    text: 'Which incoming Water moves activate Water Compaction?',
    supportingText: 'Holder survives the hit · Raises Defense by two stages',
  },
};

export const getEffectPresentation = (
  fact: Pick<TopicCatalog['effects'][number], 'name'>,
  name: string,
  options: string[],
  exact: boolean,
) => {
  const specialized =
    exact && options.every((option) => labels[option])
      ? exactPrompts[fact.name]
      : undefined;
  const condition =
    fact.name === 'water-compaction'
      ? 'Holder survives the hit'
      : fact.name === 'shell-bell'
        ? 'User remains in battle'
        : undefined;
  return {
    prompt: {
      kind: 'text' as const,
      text: specialized?.text ?? `What does ${name} do?`,
      supportingText: [
        'Generation IX',
        specialized?.supportingText ?? condition,
      ]
        .filter(Boolean)
        .join(' · '),
    },
    optionLabels: Object.fromEntries(
      options.map((option) => [option, labels[option] ?? option]),
    ),
  };
};

const exactAnswers = new Set([
  'An Electric-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
  'At the end of each turn, restores up to 1/16 of the holder’s maximum HP, regardless of its type.',
  'A Ground-type move from another Pokémon restores up to 1/4 of maximum HP, including status moves.',
  'A Grass-type move raises Attack by one stage, including status moves.',
  'A damaging Water-type hit raises Defense by two stages, whether physical or special.',
  'Each turn, restores up to 1/16 maximum HP to a Poison-type holder; other types lose 1/8 maximum HP.',
  'After a damaging move, restores up to 1/8 of the damage dealt, with a minimum of 1 HP when healing succeeds.',
  'After a damaging contact hit, the attacker loses 1/6 of its maximum HP.',
]);

export const presentEffectQuestion = (question: QuestionData): QuestionData => {
  if (
    !['held-item-effects', 'ability-effects'].includes(question.questionType) ||
    !question.options.every((option) => labels[option])
  )
    return question;
  return {
    ...question,
    ...getEffectPresentation(
      { name: question.subject.name },
      formatPokemonName(question.subject.name),
      question.options,
      exactAnswers.has(question.answer.correctOptions[0]!),
    ),
  };
};
