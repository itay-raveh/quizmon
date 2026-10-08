import { useId, useMemo } from 'react';
import { SearchCombobox } from '@/components/SearchCombobox';
import { useInteractionSound } from '@/lib/audio/sound-context';
import { useUpdateState } from '@/lib/storage/update-reload-state';
import type {
  TrainerSpecialty,
  TrainerTitle as Title,
} from '@/domain/player/trainer-progression';
import { TrainerTitle } from './TrainerTitle';
import { createSearch, normalizeSearch } from '@/domain/pokemon/search';

interface Props {
  titles: readonly Title[];
  value: TrainerSpecialty | null;
  onChange: (specialty: TrainerSpecialty | null) => void;
}

export const TrainerTitlePicker = ({ titles, value, onChange }: Props) => {
  const id = useId();
  const playInteractionSound = useInteractionSound();
  const selected = titles.find(
    (title) => title.earned && title.specialty === value,
  );
  const [query, setQuery] = useUpdateState(
    'trainer-title-query',
    selected?.label ?? '',
  );
  const search = useMemo(
    () =>
      createSearch(
        titles
          .filter((title) => title.earned)
          .map((title) => ({
            ...title,
            normalized: normalizeSearch(title.label),
          })),
      ),
    [titles],
  );
  const suggestions = search(query);
  return (
    <div className="trainer-customizer__title">
      <div className="pokemon-picker">
        <label htmlFor={`${id}-input`}>Trainer title</label>
        <SearchCombobox
          id={id}
          className="pokemon-picker__field"
          emptyClassName="pokemon-picker__empty"
          query={query}
          onQueryChange={(query) => {
            setQuery(query);
            onChange(null);
          }}
          suggestions={suggestions}
          onChoose={(title) => {
            playInteractionSound('toggle-on');
            setQuery(title.label);
            onChange(title.specialty);
          }}
          getKey={(title) => title.specialty}
          renderOption={(title) => (
            <TrainerTitle specialty={title.specialty} tier={title.tier} />
          )}
          placeholder="Search earned titles"
          emptyMessage="No earned titles found."
          exactOption={suggestions.find(
            (title) => title.label.toLowerCase() === query.trim().toLowerCase(),
          )}
        />
      </div>
    </div>
  );
};
