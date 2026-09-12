import { PokemonSearch } from '@/components/PokemonSearch';
import type { PokemonSearchOption } from '@/domain/quiz/types';
import { useMemo, useState } from 'react';

interface ChampionSearchProps {
  hideNumbers?: boolean;
  answered: boolean;
  correctOption: string;
  disabled: boolean;
  onAnswer: (option: string) => void;
  options: readonly PokemonSearchOption[];
  selectedOption?: string;
}

export const ChampionSearch = ({
  hideNumbers = false,
  answered,
  correctOption,
  disabled,
  onAnswer,
  options,
  selectedOption,
}: ChampionSearchProps) => {
  const [query, setQuery] = useState('');
  const searchOptions = useMemo(
    () => (hideNumbers ? options.map(({ name }) => ({ name })) : options),
    [hideNumbers, options],
  );
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
      options={searchOptions}
      query={query}
      result={result}
    />
  );
};
