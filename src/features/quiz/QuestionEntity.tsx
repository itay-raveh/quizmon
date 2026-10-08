import { QuestionSprite } from '@/components/PokemonRenderable';
import { formatPokemonName } from '@/domain/pokemon/format';
import type { MoveVisual } from '@/domain/quiz/types';
import { TypeBadges } from '@/components/TypeBadge';
import {
  isVisible,
  type EntityRendering,
  type RevealState,
} from '@/domain/quiz/rendering';
import type { ReactNode } from 'react';
import './styles/move-renderable.css';

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
    {src && policy.sprite !== null ? (
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

export const MoveRenderable = ({
  name,
  visual,
  src,
  policy,
  state,
  children,
}: {
  name: string;
  visual?: MoveVisual;
  src?: string;
  policy: Pick<EntityRendering, 'name' | 'sprite' | 'types'>;
  state: RevealState;
  children?: ReactNode;
}) => (
  <span className="move-renderable">
    {(visual?.sprite || src) && policy.sprite !== null ? (
      <span className="move-renderable__sprite" aria-hidden="true">
        <QuestionSprite
          src={(visual?.sprite ?? src)!}
          rule={policy.sprite}
          state={state}
          className="move-renderable__disc"
        />
      </span>
    ) : null}
    <span className="move-renderable__name">
      <strong
        style={{
          visibility: isVisible(policy.name, state) ? undefined : 'hidden',
        }}
      >
        {name}
      </strong>
      {policy.types !== 'never' && (visual?.type || visual?.damageClass) ? (
        <span
          className="move-renderable__reveal"
          aria-hidden="true"
          style={{
            visibility: isVisible(policy.types, state) ? undefined : 'hidden',
          }}
        >
          {visual.type ? <TypeBadges types={[visual.type]} /> : null}
          {visual.damageClass ? (
            <span>{formatPokemonName(visual.damageClass)}</span>
          ) : null}
        </span>
      ) : null}
      {children}
    </span>
  </span>
);
