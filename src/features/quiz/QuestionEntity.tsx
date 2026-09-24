import { PokemonIdentity } from '@/components/PokemonIdentity';
import {
  isVisible,
  spriteState,
  type EntityRendering,
  type RevealState,
  type SpriteVisibility,
} from '@/domain/quiz/question-rendering';
import type { ComponentProps } from 'react';

export const QuestionSprite = ({
  rule,
  state,
  ...props
}: Pick<
  ComponentProps<'img'>,
  'alt' | 'className' | 'fetchPriority' | 'style'
> & {
  src: string;
  rule: SpriteVisibility;
  state: RevealState;
}) => {
  if (rule === 'never') return null;
  const { visible, silhouette } = spriteState(rule, state);
  const className =
    `${props.className ?? ''} ${silhouette ? 'answer__sprite--silhouette' : ''}`.trim();
  return (
    <img
      src={props.src}
      alt={props.alt ?? ''}
      className={`pixel-sprite ${className}`.trim()}
      style={{ ...props.style, visibility: visible ? undefined : 'hidden' }}
      decoding="async"
      fetchPriority={props.fetchPriority ?? 'auto'}
      width="96"
      height="96"
    />
  );
};

export const QuestionIdentity = ({
  policy,
  state,
  ...props
}: Omit<
  ComponentProps<typeof PokemonIdentity>,
  'revealed' | 'concealNumber' | 'concealName'
> & {
  policy: EntityRendering;
  state: RevealState;
}) => (
  <PokemonIdentity
    {...props}
    dexNumber={policy.number === 'never' ? undefined : props.dexNumber}
    revealed={isVisible(policy.name, state) || isVisible(policy.number, state)}
    concealName={!isVisible(policy.name, state)}
    concealNumber={!isVisible(policy.number, state)}
  />
);
