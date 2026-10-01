import * as styles from './styles/classes.css.ts';
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
    <div className={styles.questionVisualSubject}>
      <PokemonRenderable
        policy={policy}
        state={state}
        name={name}
        dexNumber={dexNumber}
        src={src}
        types={types}
        spriteSlotClassName={
          framed
            ? styles.questionVisualPokemonSlot
            : styles.questionVisualPortrait
        }
        spriteClassName={styles.questionVisualPokemon}
        spriteFallback={
          concealed && concealment === 'question-mark' ? (
            <span className={styles.questionVisualQuestionMark}>?</span>
          ) : undefined
        }
        reserveSpriteSlot={reservePortrait}
        identityClassName={styles.questionVisualSubjectName}
        numberClassName={styles.questionVisualSubjectNumber}
        typesClassName={styles.questionVisualSubjectTypes}
      />
      {children}
    </div>
  );
};
