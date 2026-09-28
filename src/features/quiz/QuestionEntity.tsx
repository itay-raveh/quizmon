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

/** Render an item name and sprite from the same visibility policy in every role. */
export const ItemRenderable = ({
  name,
  src,
  policy,
  state,
  className,
  spriteClassName,
  spriteSlotClassName,
  nameClassName,
}: {
  /** Player-facing item name or TM label. */
  name: string;
  /** Saved sprite URL, when this item has art. */
  src?: string | null;
  /** Subject, choice, or search visibility rules. */
  policy: Pick<EntityRendering, 'name' | 'sprite'>;
  state: RevealState;
  className?: string;
  spriteClassName?: string;
  spriteSlotClassName?: string;
  nameClassName?: string;
}) => (
  <span className={className}>
    {src && policy.sprite !== 'never' ? (
      <span className={spriteSlotClassName} aria-hidden="true">
        <QuestionSprite
          src={src}
          rule={policy.sprite}
          state={state}
          className={spriteClassName}
        />
      </span>
    ) : null}
    {policy.name !== 'never' ? (
      <strong
        className={nameClassName}
        style={{
          visibility: isVisible(policy.name, state) ? undefined : 'hidden',
        }}
      >
        {name}
      </strong>
    ) : null}
  </span>
);
