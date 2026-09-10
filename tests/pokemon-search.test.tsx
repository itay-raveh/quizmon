import { fireEvent, render, screen } from '@testing-library/react';
import { ChampionSearch } from '@/components/ChampionSearch';
import { PokemonPicker } from '@/components/PokemonPicker';

const options = [
  { name: 'charmander', dexNumber: 4, sprite: null },
  { name: 'charmeleon', dexNumber: 5, sprite: null },
  { name: 'charizard', dexNumber: 6, sprite: null },
];

describe.each(['partner', 'champion'] as const)('%s search', (kind) => {
  const setup = (query = 'char') => {
    const onChoose = vi.fn();
    render(
      kind === 'partner' ? (
        <PokemonPicker options={options} value={null} onChange={onChoose} />
      ) : (
        <ChampionSearch
          answered={false}
          correctOption="charmander"
          disabled={false}
          onAnswer={onChoose}
          options={options}
        />
      ),
    );
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: query } });
    onChoose.mockClear();
    return { input, onChoose };
  };

  it.each([' CHÁR-- ', 'ＣＨＡＲ', 'cha\u0301r'])(
    'normalizes %s without changing suggestion order',
    (query) => {
      setup(query);
      const suggestions = screen.getAllByRole('option');
      expect(suggestions).toHaveLength(3);
      ['Charizard', 'Charmander', 'Charmeleon'].forEach((name, index) => {
        expect(suggestions[index]).toHaveAccessibleName(name);
      });
    },
  );

  it('wraps arrow navigation and selects with Enter', () => {
    const { input, onChoose } = setup();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: 'Charmeleon' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Charizard' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Charmander');
    expect(screen.queryByRole('listbox')).toBeNull();
    if (kind === 'champion') {
      expect(onChoose).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    }
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('charmander');
  });

  it('clears keyboard selection when dismissed or edited', () => {
    const { input, onChoose } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('char');
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: 'Charmeleon' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.change(input, { target: { value: 'charm' } });
    expect(input).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Charmander' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('selects only after a completed click or tap', () => {
    const { input, onChoose } = setup();
    const option = screen.getByRole('option', { name: 'Charizard' });
    fireEvent.pointerDown(option, { pointerType: 'touch' });
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(input).toHaveValue('char');
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.pointerCancel(option, { pointerType: 'touch' });
    expect(screen.getByRole('listbox')).toBeVisible();
    fireEvent.click(option);
    expect(input).toHaveValue('Charizard');
    expect(screen.queryByRole('listbox')).toBeNull();
    if (kind === 'champion') {
      expect(onChoose).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    }
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('charizard');
  });
});
