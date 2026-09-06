import type { ReactNode } from 'react';
import { formatPokedexNumber, formatPokemonName } from '@/game/format';

interface PokemonIdentityProps {
  children?: ReactNode;
  className?: string;
  dexNumber?: number;
  hideNumberFromAccessibility?: boolean;
  name: string;
  nameClassName?: string;
  numberClassName?: string;
  revealed?: boolean;
}

export const PokemonIdentity = ({
  children,
  className = '',
  dexNumber,
  hideNumberFromAccessibility = false,
  name,
  nameClassName = '',
  numberClassName = '',
  revealed = true,
}: PokemonIdentityProps) => (
  <span
    className={`pokemon-identity ${className}`.trim()}
    aria-hidden={!revealed || undefined}
    style={{ visibility: revealed ? undefined : 'hidden' }}
  >
    {dexNumber === undefined ? null : (
      <small
        aria-hidden={hideNumberFromAccessibility || undefined}
        className={`pokemon-identity__number ${numberClassName}`.trim()}
      >
        {formatPokedexNumber(dexNumber)}
      </small>
    )}
    <span className={`pokemon-identity__name ${nameClassName}`.trim()}>
      {formatPokemonName(name)}
    </span>
    {children}
  </span>
);
