import { act, renderHook } from '@testing-library/react';
import { useRewardSounds } from './useRewardSounds';

const audio = vi.hoisted(() => ({
  ctx: {
    state: 'running',
    currentTime: 0,
    createOscillator: vi.fn(),
    createGain: vi.fn(),
  },
  masterGain: {},
}));
vi.mock('howler', () => ({ Howler: audio }));

beforeEach(() => {
  vi.clearAllMocks();
  audio.ctx.createOscillator.mockImplementation(() => ({
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  audio.ctx.createGain.mockImplementation(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
});

it.each(['bronze', 'silver', 'gold'] as const)(
  'stops all scheduled %s fanfare voices on departure',
  (tier) => {
    const hook = renderHook(() => useRewardSounds(1));
    act(() => hook.result.current.play(0, tier));
    const voices = audio.ctx.createOscillator.mock.results.map(
      ({ value }) => value as { stop: ReturnType<typeof vi.fn> },
    );
    expect(voices.length).toBeGreaterThan(0);
    expect(
      voices.some((voice) => Number(voice.stop.mock.calls[0]?.[0] ?? 0) >= 1),
    ).toBe(true);
    hook.unmount();
    for (const voice of voices) expect(voice.stop).toHaveBeenLastCalledWith();
  },
);

it('does not create fanfare voices when muted', () => {
  const hook = renderHook(() => useRewardSounds(0));
  act(() => hook.result.current.play(0, 'silver'));
  expect(audio.ctx.createOscillator).not.toHaveBeenCalled();
});
