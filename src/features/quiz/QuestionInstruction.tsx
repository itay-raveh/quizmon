import { formatTypeMultiplier } from '@/domain/pokemon/format';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import type { QuestionData } from '@/domain/quiz/types';
import { NatureEffect } from './NatureEffect';

export const QuestionInstruction = ({
  question,
}: {
  question: QuestionData;
}) => {
  const kind = question.visual?.kind;
  const supportingText = question.prompt.supportingText;
  const subjectInstruction =
    question.questionType === 'ev-yields'
      ? (question.prompt.kind === 'pokemon'
          ? question.prompt.before
          : question.prompt.text
        ).startsWith('Which stat')
        ? 'Which stat gains EVs from defeating this Pokémon?'
        : 'What EVs does defeating this Pokémon give?'
      : question.questionType === 'hidden-abilities'
        ? 'What is this Pokémon’s Hidden Ability?'
        : question.questionType === 'egg-group-connections'
          ? 'Which Pokémon shares an Egg Group with this one?'
          : kind === 'evolution-endpoints'
            ? question.questionType === 'evolution-items'
              ? 'Which item triggers this evolution?'
              : 'What are the minimum requirements for this evolution?'
            : undefined;
  if (subjectInstruction)
    return (
      <>
        {subjectInstruction}
        {supportingText ? (
          <span className="question__supporting-text">{supportingText}</span>
        ) : null}
      </>
    );
  if (question.questionType === 'nature-effects') {
    const effect = question.optionReveals?.[question.answer.correctOptions[0]!];
    if (effect)
      return (
        <>
          Which nature?
          <span className="question__nature-effect">
            <NatureEffect description={effect} />
          </span>
        </>
      );
  }
  if (kind === 'type-check' && question.answer.interaction === 'multi-select')
    return 'Select every type this Pokémon has.';
  if (
    question.visual?.kind === 'type-matchup' &&
    question.answer.interaction === 'multi-select'
  )
    return `Select every attack type that deals ×${formatTypeMultiplier(question.visual.multiplier)} damage.`;
  if (kind === 'type-check') return 'Which type does this Pokémon have?';
  if (kind === 'type-twins') return 'Which Pokémon has the same two types?';
  if (kind === 'evolution-link') return 'Complete the evolution chain';
  if (kind === 'evolution-shift')
    return 'Which type does it gain on evolution?';
  if (kind === 'type-roundup') return 'Select every Pokémon with this type';
  if (kind === 'generation-roundup')
    return 'Select every Pokémon introduced in this generation';
  if (question.visual?.kind === 'type-matchup')
    return `Which type deals ×${formatTypeMultiplier(question.visual.multiplier)} damage?`;
  if (question.visual?.kind === 'counter-pick')
    return `Whose best attack type deals ×${formatTypeMultiplier(question.visual.multiplier)} damage?`;
  if (question.visual?.kind === 'stat-showdown')
    return (
      <>
        Which Pokémon has the <strong>{question.visual.direction}</strong> stat?
      </>
    );
  if (question.questionType === 'ability-check')
    return 'Which ability can this Pokémon have?';
  if (question.questionType === 'move-check')
    return 'Which move can it learn by leveling up?';
  const { prompt } = question;
  if (prompt.kind === 'text')
    return (
      <>
        {prompt.text}
        {prompt.supportingText ? (
          <span className="question__supporting-text">
            {prompt.supportingText}
          </span>
        ) : null}
      </>
    );
  return (
    <>
      {prompt.before}
      <PokemonIdentity
        inline
        name={prompt.name}
        dexNumber={prompt.dexNumber}
        numberClassName="question__subject-number"
      />
      {prompt.after}
    </>
  );
};
