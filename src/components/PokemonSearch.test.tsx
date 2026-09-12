import { ChampionSearch } from '@/features/quiz/ChampionSearch';
import { PokemonPicker } from '@/features/trainer/PokemonPicker';
import { fireEvent, render, screen } from '@testing-library/react';
import { catalog } from '../../tests/fixtures/catalog';

const hisuianOptions = Object.entries(catalog.pokemon)
  .filter(([name]) => name.endsWith('-hisui'))
  .map(([name, pokemon]) => ({
    name,
    dexNumber: pokemon.speciesId,
    sprite: null,
  }));

const options = [
  { name: 'charmander', dexNumber: 4, sprite: null },
  { name: 'charmeleon', dexNumber: 5, sprite: null },
  { name: 'charizard', dexNumber: 6, sprite: null },
  { name: 'raichu', dexNumber: 26, sprite: null },
  {
    name: 'raichu-alola',
    dexNumber: 26,
    sprite: '/sprites/pokemon/10100.png',
  },
  ...hisuianOptions,
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

  it('keeps every regional match selectable beyond the first six results', () => {
    const { input, onChoose } = setup('Hisu');
    const suggestions = screen.getAllByRole('option');
    expect(suggestions).toHaveLength(hisuianOptions.length);
    const typhlosion = screen.getByRole('option', {
      name: 'Hisuian Typhlosion',
    });
    for (let index = 0; index <= suggestions.indexOf(typhlosion); index += 1)
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(typhlosion).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    if (kind === 'champion')
      fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('typhlosion-hisui');
  });

  it.each(['Alolan Raichu', 'raichu-alola'])(
    'selects a regional form by %s',
    (query) => {
      const { onChoose } = setup(query);
      fireEvent.click(
        kind === 'partner'
          ? screen.getByRole('option', { name: 'Alolan Raichu' })
          : screen.getByRole('button', { name: 'Guess' }),
      );
      expect(onChoose).toHaveBeenCalledExactlyOnceWith('raichu-alola');
    },
  );

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

  it('requires selection of a fuzzy suggestion before confirming a guess', () => {
    const { input, onChoose } = setup('charmnder');
    expect(screen.getAllByRole('option')[0]).toHaveAccessibleName('Charmander');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChoose).not.toHaveBeenCalled();
    if (kind === 'champion')
      expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    if (kind === 'champion')
      fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('charmander');
  });

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
