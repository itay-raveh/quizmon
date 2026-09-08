import { fireEvent, render, screen } from '@testing-library/react';
import { SoundContext, silentSoundControls } from '@/audio/sound';
import { Checkbox } from '@/components/Checkbox';
import { SelectionTile } from '@/components/SelectionTile';

it.each([
  { name: 'Checkbox', Control: Checkbox },
  { name: 'SelectionTile', Control: SelectionTile },
])(
  'plays toggle feedback before forwarding changes for $name',
  ({ Control }) => {
    const events: string[] = [];
    render(
      <SoundContext
        value={{
          ...silentSoundControls,
          playToggleOn: () => events.push('on'),
          playToggleOff: () => events.push('off'),
        }}
      >
        <Control
          label="Sound choice"
          onChange={(event) => events.push(`change:${event.target.checked}`)}
        />
      </SoundContext>,
    );

    const input = screen.getByRole('checkbox', { name: 'Sound choice' });
    fireEvent.click(input);
    expect(input).toBeChecked();
    fireEvent.click(input);
    expect(input).not.toBeChecked();
    expect(events).toEqual(['on', 'change:true', 'off', 'change:false']);
  },
);

it('plays one on sound when a radio tile is selected', () => {
  const playToggleOn = vi.fn();
  const playToggleOff = vi.fn();
  render(
    <SoundContext
      value={{ ...silentSoundControls, playToggleOn, playToggleOff }}
    >
      <SelectionTile inputType="radio" label="Radio choice" />
    </SoundContext>,
  );
  const input = screen.getByRole('radio', { name: 'Radio choice' });
  fireEvent.click(input);
  fireEvent.click(input);
  expect(input).toBeChecked();
  expect(playToggleOn).toHaveBeenCalledTimes(1);
  expect(playToggleOff).not.toHaveBeenCalled();
});
