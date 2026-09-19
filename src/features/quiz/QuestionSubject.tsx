import { TypeBadges } from '@/components/TypeBadge';
import {
  isVisible,
  spriteState,
  type EntityRendering,
  type RevealState,
} from '@/domain/quiz/question-rendering';
import type { ReactNode } from 'react';
import { QuestionIdentity, QuestionSprite } from './QuestionEntity';

export const QuestionSubjectTypes = ({
  answered,
  types,
}: {
  answered: boolean;
  types: readonly string[];
}) => (
  <span style={{ visibility: answered ? undefined : 'hidden' }}>
    <TypeBadges className="question-visual__subject-types" types={types} />
  </span>
);

export const QuestionSubjectIdentity = ({
  name,
  dexNumber,
  policy,
  state,
}: {
  name: string;
  dexNumber?: number;
  policy: EntityRendering;
  state: RevealState;
}) => (
  <QuestionIdentity
    policy={policy}
    state={state}
    className="question-visual__subject-name"
    name={name}
    dexNumber={dexNumber}
    numberClassName="question-visual__subject-number"
  />
);

export const QuestionSubject = ({
  name,
  dexNumber,
  src,
  policy,
  state,
  framed = false,
  reservePortrait = false,
  concealment = 'question-mark',
  children,
}: {
  name: string;
  dexNumber?: number;
  src?: string;
  policy: EntityRendering;
  state: RevealState;
  framed?: boolean;
  reservePortrait?: boolean;
  concealment?: 'question-mark' | 'blank';
  children?: ReactNode;
}) => {
  const concealed =
    !isVisible(policy.name, state) &&
    !spriteState(policy.sprite, state).visible;
  return (
    <div className="question-visual__subject">
      {src || concealed || reservePortrait ? (
        <span
          className={
            framed
              ? 'question-visual__pokemon-slot'
              : 'question-visual__portrait'
          }
        >
          {concealed && concealment === 'question-mark' ? (
            <span className="question-visual__question-mark">?</span>
          ) : src ? (
            <QuestionSprite
              rule={policy.sprite}
              state={state}
              className="question-visual__pokemon"
              src={src}
            />
          ) : null}
        </span>
      ) : null}
      <QuestionSubjectIdentity
        policy={policy}
        state={state}
        name={name}
        dexNumber={dexNumber}
      />
      {children}
    </div>
  );
};
