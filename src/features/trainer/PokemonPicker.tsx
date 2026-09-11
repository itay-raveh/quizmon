import { PokemonSearch } from '@/components/PokemonSearch';
import { formatPokemonName } from '@/domain/pokemon/format';
import { useUpdateState } from '@/features/installation/update-session';

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
