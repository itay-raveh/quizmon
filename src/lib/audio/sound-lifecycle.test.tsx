import { render, waitFor } from '@testing-library/react';
import { Howler, type Howl } from 'howler';
import { SoundProvider } from './SoundProvider';

// Use the real audio library to check retention; jsdom does not play audio.
const audioInstances = () => (Howler as unknown as { _howls: Howl[] })._howls;
const retainedSounds = () => audioInstances().length;

afterEach(() => {
  Howler.unload();
});

it('releases audio instances when sound is disabled and on unmount', async () => {
  const baseline = retainedSounds();
  const view = render(
    <SoundProvider prepareScoreCount volume={1}>
      <span>Game</span>
    </SoundProvider>,
  );
  await waitFor(() => expect(retainedSounds()).toBeGreaterThan(baseline));
  const enabledCount = retainedSounds();
  view.rerender(
    <SoundProvider prepareScoreCount volume={0}>
      <span>Game</span>
    </SoundProvider>,
  );
  expect(retainedSounds()).toBe(baseline);
  view.rerender(
    <SoundProvider prepareScoreCount volume={1}>
      <span>Game</span>
    </SoundProvider>,
  );
  await waitFor(() => expect(retainedSounds()).toBe(enabledCount));
  view.unmount();
  expect(retainedSounds()).toBe(baseline);
});

it('keeps instances across volume changes and releases the score sound', async () => {
  const baseline = retainedSounds();
  const view = render(
    <SoundProvider prepareScoreCount volume={1}>
      <span>Game</span>
    </SoundProvider>,
  );
  await waitFor(() => expect(retainedSounds()).toBeGreaterThan(baseline));
  const instances = [...audioInstances()];

  view.rerender(
    <SoundProvider prepareScoreCount volume={0.5}>
      <span>Game</span>
    </SoundProvider>,
  );

  expect(audioInstances()).toEqual(instances);

  view.rerender(
    <SoundProvider prepareScoreCount={false} volume={0.5}>
      <span>Game</span>
    </SoundProvider>,
  );
  expect(retainedSounds()).toBe(instances.length - 1);
  view.unmount();
  expect(retainedSounds()).toBe(baseline);
});
