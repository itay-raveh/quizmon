import { useState } from 'react';
import type { PokemonSearchOption } from '@/game/types';
import { PokemonSearch } from './PokemonSearch';

interface ChampionSearchProps {
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly PokemonSearchOption[];
  selectedOption?: string;
}

export const ChampionSearch = ({
  answered,
  correctOption,
  disabled,
  onAnswer,
  options,
  selectedOption,
}: ChampionSearchProps) => {
  const [query, setQuery] = useState('');
  const result = answered
    ? selectedOption === correctOption
      ? 'correct'
      : 'wrong'
    : null;

  return (
    <PokemonSearch
      disabled={disabled || answered}
      mode="champion"
      onConfirm={onAnswer}
      onQueryChange={setQuery}
      options={options}
      query={query}
      result={result}
    />
  );
};
