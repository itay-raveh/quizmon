import { PokemonIdentity } from './PokemonIdentity';
import { TypeBadges } from './TypeBadge';
import {
  isVisible,
  spriteState,
  type EntityRendering,
  type RevealState,
  type SpriteRendering,
} from '@/domain/quiz/rendering';
import type { ComponentProps, ReactNode } from 'react';

export const QuestionSprite = ({
  rule,
  state,
  ...props
}: Pick<
  ComponentProps<'img'>,
  'alt' | 'className' | 'fetchPriority' | 'style'
> & {
  src: string;
  rule: SpriteRendering;
  state: RevealState;
}) => {
  if (rule === null) return null;
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
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
      fetchPriority={props.fetchPriority ?? 'auto'}
      width="96"
      height="96"
    />
  );
};

export const QuestionIdentity = ({
  policy,
  state,
  revealChildren = false,
  ...props
}: Omit<
  ComponentProps<typeof PokemonIdentity>,
  'revealed' | 'concealNumber' | 'concealName'
> & {
  policy: EntityRendering;
  state: RevealState;
  revealChildren?: boolean;
}) => (
  <PokemonIdentity
    {...props}
    dexNumber={policy.number === 'never' ? undefined : props.dexNumber}
    revealed={
      isVisible(policy.name, state) ||
      (props.dexNumber !== undefined && isVisible(policy.number, state)) ||
      revealChildren
    }
    concealName={!isVisible(policy.name, state)}
    concealNumber={!isVisible(policy.number, state)}
  />
);

/** Shared Pokémon fields for a prompt, choice, related entity, or search row. */
export const PokemonRenderable = ({
  name,
  dexNumber,
  src,
  types,
  policy,
  state,
  spriteSlotClassName,
  spriteClassName,
  identityClassName,
  nameClassName,
  numberClassName,
  typesClassName,
  spriteFallback,
  reserveSpriteSlot = false,
  hideNumberFromAccessibility = false,
  children,
}: {
  name: string;
  dexNumber?: number;
  src?: string | null;
  types?: readonly string[];
  policy: EntityRendering;
  state: RevealState;
  spriteSlotClassName?: string;
  spriteClassName?: string;
  identityClassName?: string;
  nameClassName?: string;
  numberClassName?: string;
  typesClassName?: string;
  spriteFallback?: ReactNode;
  reserveSpriteSlot?: boolean;
  hideNumberFromAccessibility?: boolean;
  children?: ReactNode;
}) => {
  const showTypes = Boolean(types?.length) && policy.types !== 'never';
  const visibleTypes = showTypes && isVisible(policy.types, state);
  return (
    <>
      {(src && policy.sprite !== null) ||
      spriteFallback ||
      reserveSpriteSlot ? (
        <span className={spriteSlotClassName} aria-hidden="true">
          {spriteFallback ??
            (src ? (
              <QuestionSprite
                src={src}
                rule={policy.sprite}
                state={state}
                className={spriteClassName}
              />
            ) : null)}
        </span>
      ) : null}
      <QuestionIdentity
        name={name}
        dexNumber={dexNumber}
        policy={policy}
        state={state}
        revealChildren={visibleTypes}
        className={identityClassName}
        nameClassName={nameClassName}
        numberClassName={numberClassName}
        hideNumberFromAccessibility={hideNumberFromAccessibility}
      >
        {showTypes ? (
          <span style={{ visibility: visibleTypes ? undefined : 'hidden' }}>
            <TypeBadges className={typesClassName} types={types ?? []} />
          </span>
        ) : null}
        {children}
      </QuestionIdentity>
    </>
  );
};
