import { useUpdateState } from '@/pwa/update-state';
import { formatPokemonName } from '@/game/format';
import { PokemonSearch } from './PokemonSearch';

interface PokemonPickerProps {
  onChange: (pokemon: string | null) => void;
  options: readonly {
    name: string;
    sprite: string | null;
  }[];
  value: string | null;
}

export const PokemonPicker = ({
  onChange,
  options,
  value,
}: PokemonPickerProps) => {
  const [query, setQuery] = useUpdateState(
    'partner-query',
    value ? formatPokemonName(value) : '',
  );

  return (
    <PokemonSearch
      mode="partner"
      onClear={() => onChange(null)}
      onConfirm={onChange}
      onQueryChange={setQuery}
      options={options}
      query={query}
    />
  );
};
