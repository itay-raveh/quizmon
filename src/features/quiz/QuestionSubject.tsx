import {
  isVisible,
  spriteState,
  type EntityRendering,
  type RevealState,
} from '@/domain/quiz/rendering';
import type { ReactNode } from 'react';
import { PokemonRenderable } from './QuestionEntity';

export const QuestionSubject = ({
  name,
  dexNumber,
  src,
  types,
  policy,
  state,
  framed = false,
  reservePortrait = false,
  concealment = 'question-mark',
  children,
}: {
  name: string;
  dexNumber?: number;
  src?: string | null;
  types?: readonly string[];
  policy: EntityRendering;
  state: RevealState;
  framed?: boolean;
  reservePortrait?: boolean;
  concealment?: 'question-mark' | 'blank';
  children?: ReactNode;
}) => {
  const concealed =
    !isVisible(policy.name, state) &&
    !(dexNumber !== undefined && isVisible(policy.number, state)) &&
    !(types?.length && isVisible(policy.types, state)) &&
    !(src && spriteState(policy.sprite, state).visible);
  return (
    <div className="question-visual__subject">
      <PokemonRenderable
        policy={policy}
        state={state}
        name={name}
        dexNumber={dexNumber}
        src={src}
        types={types}
        spriteSlotClassName={
          framed ? 'question-visual__pokemon-slot' : 'question-visual__portrait'
        }
        spriteClassName="question-visual__pokemon"
        spriteFallback={
          concealed && concealment === 'question-mark' ? (
            <span className="question-visual__question-mark">?</span>
          ) : undefined
        }
        reserveSpriteSlot={reservePortrait}
        identityClassName="question-visual__subject-name"
        numberClassName="question-visual__subject-number"
        typesClassName="question-visual__subject-types"
      />
      {children}
    </div>
  );
};
