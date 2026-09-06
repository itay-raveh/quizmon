import { formatPokemonName, formatPokedexNumber } from '@/game/format';
import type { QuestionData } from '@/game/types';

export const QuestionInstruction = ({
  question,
}: {
  question: QuestionData;
}) => {
  const kind = question.visual?.kind;
  if (kind === 'type-check') return <>Which type does this Pokémon have?</>;
  if (kind === 'type-twins') return <>Which Pokémon has the same two types?</>;
  if (kind === 'evolution-link') return <>Complete the evolution chain</>;
  if (kind === 'evolution-shift')
    return <>Which type does it gain on evolution?</>;
  if (kind === 'type-roundup') return <>Select every Pokémon with this type</>;
  if (kind === 'generation-roundup')
    return <>Select every Pokémon introduced in this generation</>;
  if (kind === 'type-matchup') return <>Which type deals this damage?</>;
  if (kind === 'counter-pick') return <>Which Pokémon deals this damage?</>;
  if (question.visual?.kind === 'stat-showdown')
    return (
      <>
        Which Pokémon has the <strong>{question.visual.direction}</strong> stat?
      </>
    );
  if (question.questionType === 'ability-check')
    return <>Which ability can this Pokémon have?</>;
  if (question.questionType === 'move-check')
    return <>Which move can it learn by leveling up?</>;
  const { prompt } = question;
  return prompt.kind === 'text' ? (
    <>{prompt.text}</>
  ) : (
    <>
      {prompt.before}
      <strong>{formatPokemonName(prompt.name)}</strong>{' '}
      <small className="question__subject-number">
        ({formatPokedexNumber(prompt.dexNumber)})
      </small>
      {prompt.after}
    </>
  );
};
