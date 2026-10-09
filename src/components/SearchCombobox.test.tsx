import { Autocomplete } from '@base-ui/react/autocomplete';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { SearchCombobox } from './SearchCombobox';

vi.mock('@base-ui/react/autocomplete', () => ({
  Autocomplete: { Root: vi.fn(() => null) },
}));

test('commits Base UI selection without treating it as typing', () => {
  const options = [
    { name: 'charcadet', label: 'Charcadet' },
    { name: 'charizard', label: 'Charizard' },
  ];
  const onChoose = vi.fn();
  const onQueryChange = vi.fn();
  renderToStaticMarkup(
    <SearchCombobox
      id="partner"
      className="pokemon-picker__field"
      query="char"
      suggestions={options}
      onChoose={onChoose}
      onQueryChange={onQueryChange}
      getKey={(option) => option.name}
      getLabel={(option) => option.label}
      renderOption={(option) => option.label}
      placeholder="Search"
      emptyMessage="No matches"
    />,
  );
  const onValueChange = vi.mocked(Autocomplete.Root).mock.lastCall![0]
    .onValueChange!;
  const details = {
    event: new Event('mouseup') as MouseEvent,
    cancel: vi.fn(),
    allowPropagation: vi.fn(),
    isCanceled: false,
    isPropagationAllowed: false,
    trigger: undefined,
  };

  onValueChange('Charizard', { ...details, reason: 'item-press' });
  expect(onChoose).toHaveBeenCalledExactlyOnceWith(options[1]);
  expect(onQueryChange).not.toHaveBeenCalled();

  onValueChange('charm', { ...details, reason: 'input-change' });
  expect(onQueryChange).toHaveBeenCalledExactlyOnceWith('charm');
  expect(onChoose).toHaveBeenCalledTimes(1);
});
