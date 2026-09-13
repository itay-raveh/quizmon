import {
  formatPokedexNumber,
  formatPokemonName,
} from '@/domain/pokemon/format';
import type { ReactNode } from 'react';

interface PokemonIdentityProps {
  children?: ReactNode;
  inline?: boolean;
  className?: string;
  dexNumber?: number;
  concealNumber?: boolean;
  concealName?: boolean;
  hideNumberFromAccessibility?: boolean;
  name: string;
  nameClassName?: string;
  numberClassName?: string;
  revealed?: boolean;
}

export const PokemonIdentity = ({
  children,
  inline = false,
  className = '',
  dexNumber,
  concealNumber = false,
  concealName = false,
  hideNumberFromAccessibility = false,
  name,
  nameClassName = '',
  numberClassName = '',
  revealed = true,
}: PokemonIdentityProps) => {
  const number =
    dexNumber === undefined ? null : (
      <small
        aria-hidden={hideNumberFromAccessibility || concealNumber || undefined}
        style={{ visibility: concealNumber ? 'hidden' : undefined }}
        className={`pokemon-identity__number ${numberClassName}`.trim()}
      >
        {inline
          ? `(${formatPokedexNumber(dexNumber)})`
          : formatPokedexNumber(dexNumber)}
      </small>
    );
  return (
    <span
      className={`pokemon-identity ${className}`.trim()}
      aria-hidden={!revealed || undefined}
      style={{ visibility: revealed ? undefined : 'hidden' }}
    >
      {inline ? null : number}
      <span
        style={{ visibility: concealName ? 'hidden' : undefined }}
        aria-hidden={concealName || undefined}
        className={`pokemon-identity__name ${nameClassName}`.trim()}
      >
        {formatPokemonName(name)}
      </span>
      {inline ? <> {number}</> : null}
      {children}
    </span>
  );
};
