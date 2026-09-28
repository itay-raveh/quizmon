import { formatTypeMultiplier } from '@/domain/pokemon/format';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import type { QuestionData } from '@/domain/quiz/types';

export const QuestionInstruction = ({
  question,
}: {
  question: QuestionData;
}) => {
  const kind = question.visual?.kind;
  const supportingText = question.prompt.supportingText;
  const subjectInstruction =
    question.questionType === 'evYields'
      ? question.prompt.kind === 'pokemon'
        ? `${question.prompt.before}this Pokémon${question.prompt.after}`
        : question.prompt.kind === 'text'
          ? question.prompt.text
          : `${question.prompt.before}${question.prompt.name}${question.prompt.after}`
      : question.questionType === 'hiddenAbilities'
        ? 'What is this Pokémon’s Hidden Ability?'
        : kind === 'evolution-endpoints'
          ? question.prompt.kind === 'text'
            ? question.prompt.text
            : 'Which requirement completes this evolution?'
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
  if (question.questionType === 'natureEffects') return 'Which nature?';
  if (kind === 'pokemonTypes' && question.answer.interaction === 'multi-select')
    return 'Select every type this Pokémon has.';
  if (
    question.visual?.kind === 'typeMatchup' &&
    question.answer.interaction === 'multi-select'
  )
    return `Select every attack type that deals ×${formatTypeMultiplier(question.visual.multiplier)} damage.`;
  if (kind === 'pokemonTypes') return 'Which type does this Pokémon have?';
  if (kind === 'dualTypeMatch') return 'Which Pokémon has the same two types?';
  if (kind === 'evolutionChain') return 'Complete the evolution chain';
  if (kind === 'evolutionGainedType')
    return 'Which type does it gain on evolution?';
  if (kind === 'pokemonByType') return 'Select every Pokémon with this type';
  if (kind === 'pokemonByGeneration')
    return 'Select every Pokémon introduced in this generation';
  if (question.visual?.kind === 'typeMatchup')
    return `Which type deals ×${formatTypeMultiplier(question.visual.multiplier)} damage?`;
  if (question.visual?.kind === 'superEffectiveAttacker')
    return `Whose best attack type deals ×${formatTypeMultiplier(question.visual.multiplier)} damage?`;
  if (question.visual?.kind === 'statExtremes')
    return (
      <>
        Which Pokémon has the <strong>{question.visual.direction}</strong> stat?
      </>
    );
  if (question.questionType === 'pokemonAbilities')
    return 'Which ability can this Pokémon have?';
  if (question.questionType === 'levelUpMoves')
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
  if (prompt.kind === 'item')
    return `${prompt.before}${prompt.name}${prompt.after}`;
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
