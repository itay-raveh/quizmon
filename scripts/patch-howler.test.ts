import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import type { Howl, Howler } from 'howler';
import { patchHowler } from './patch-howler';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('howler'), 'utf8');
type TestHowl = Howl & { _playLock: boolean; _queue: unknown[] };
type TestHowler = typeof Howler & {
  state: string;
  _audioUnlocked: boolean;
  _autoResume: () => void;
};

function audioHarness() {
  const listeners = new Map<string, Set<() => void>>();
  const requests: { resolve: () => void; reject: (error: Error) => void }[] =
    [];
  const sources: {
    buffer: { duration: number } | null;
    onended: (() => void) | null;
    start: ReturnType<typeof vi.fn>;
  }[] = [];
  const gain = () => ({
    gain: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const context = {
    state: 'suspended',
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    createGain: gain,
    createBuffer: () => ({ duration: 0 }),
    createBufferSource: () => {
      const node = {
        buffer: null as { duration: number } | null,
        onended: null as (() => void) | null,
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        playbackRate: { setValueAtTime: vi.fn() },
      };
      sources.push(node);
      return node;
    },
    decodeAudioData: (buffer: ArrayBuffer) => {
      void buffer;
      return Promise.resolve({ duration: 2 });
    },
    resume: () =>
      new Promise<void>((resolve, reject) =>
        requests.push({ resolve, reject }),
      ),
    suspend: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  class Audio {
    muted = false;
    canPlayType() {
      return 'probably';
    }
    play() {
      return Promise.resolve();
    }
  }
  const exports = {} as {
    Howl: new (options: ConstructorParameters<typeof Howl>[0]) => TestHowl;
    Howler: TestHowler;
  };
  const sandbox = {
    exports,
    module: { exports },
    Audio,
    AudioContext: function () {
      return context;
    },
    document: {
      addEventListener: (event: string, fn: () => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      },
      removeEventListener: (event: string, fn: () => void) =>
        listeners.get(event)?.delete(fn),
    },
    window: {
      location: { protocol: 'https:' },
      navigator: {
        userAgent: 'Chrome',
        appVersion: 'Chrome',
        platform: 'Linux',
        vendor: 'Google',
      },
    },
    Promise,
    Uint8Array,
    ArrayBuffer,
    atob,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
  };
  Object.assign(sandbox, { global: sandbox });
  runInNewContext(patchHowler(source), sandbox);
  exports.Howler.autoSuspend = false;
  const sound = new exports.Howl({ src: ['data:audio/wav;base64,AA=='] });
  const failure = new DOMException(
    'Failed to start the audio device',
    'InvalidStateError',
  );
  const gesture = () =>
    [...(listeners.get('click') ?? [])].forEach((fn) => fn());
  const settle = (success: boolean, error: Error = failure) => {
    const pending = requests.splice(0);
    context.state = success ? 'running' : 'suspended';
    for (const request of pending) {
      if (success) request.resolve();
      else request.reject(error);
    }
  };
  const starts = () =>
    sources.filter(
      (node) => node.buffer?.duration === 2 && node.start.mock.calls.length > 0,
    );
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
  };
  const unlock = async () => {
    gesture();
    settle(true);
    await flush();
    sources
      .filter((node) => node.buffer?.duration === 0)
      .forEach((node) => node.onended?.());
    await flush();
  };
  const suspend = () => {
    context.state = 'suspended';
    exports.Howler.state = 'suspended';
  };
  return {
    ...exports,
    sound,
    failure,
    gesture,
    settle,
    starts,
    flush,
    unlock,
    suspend,
    listeners,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('keeps gesture unlock available after repeated device failures without false success', async () => {
  const h = audioHarness();
  await h.flush();
  const unlocked = vi.fn();
  const resumed = vi.fn();
  h.sound.on('unlock', unlocked).on('resume', resumed);
  for (let attempt = 0; attempt < 3; attempt++) {
    h.gesture();
    h.settle(false);
    await h.flush();
    expect(h.Howler._audioUnlocked).toBe(false);
    expect(h.listeners.get('click')?.size).toBe(1);
  }
  expect(unlocked).not.toHaveBeenCalled();
  expect(resumed).not.toHaveBeenCalled();
  await h.unlock();
  expect(unlocked).toHaveBeenCalledOnce();
  expect(h.listeners.get('click')?.size).toBe(0);
});

it('discards failed plays, applies queued mute/volume, and recovers after a later gesture', async () => {
  const h = audioHarness();
  await h.flush();
  await h.unlock();
  h.suspend();
  const failed = vi.fn();
  h.sound.on('playerror', failed);
  h.sound.play();
  h.sound.volume(0.2);
  h.sound.mute(true);
  h.sound.play();
  h.settle(false);
  await h.flush();
  expect(failed).toHaveBeenCalledWith(null, h.failure);
  expect(h.sound._playLock).toBe(false);
  expect(h.sound._queue).toHaveLength(0);
  expect(h.sound.volume()).toBe(0.2);
  expect(h.sound.mute()).toBe(true);
  expect(h.starts()).toHaveLength(0);
  await h.unlock();
  expect(h.starts()).toHaveLength(0);
  h.sound.mute(false);
  h.sound.play();
  await h.flush();
  expect(h.starts()).toHaveLength(1);
  expect(h.sound.playing()).toBe(true);
  h.sound.stop();
  expect(h.sound.playing()).toBe(false);
});

it('cancels a stopped pending play before a successful resume and permits a fresh play', async () => {
  const h = audioHarness();
  await h.flush();
  const id = h.sound.play();
  h.sound.stop(id);
  h.settle(true);
  await h.flush();
  expect(h.starts()).toHaveLength(0);
  h.sound.play();
  await h.flush();
  expect(h.starts()).toHaveLength(1);
});

it('does not replay cancelled sounds after stop and repeated failed recovery', async () => {
  const h = audioHarness();
  await h.flush();
  for (let attempt = 0; attempt < 3; attempt++) {
    h.sound.play();
    h.settle(false);
    await h.flush();
    h.sound.stop();
    expect(h.sound.playing()).toBe(false);
  }
  await h.unlock();
  expect(h.starts()).toHaveLength(0);
  h.sound.play();
  expect(h.starts()).toHaveLength(1);
});

it.each([true, false])(
  'leaves an unloaded pending Howl inert when resume succeeds=%s',
  async (success) => {
    const h = audioHarness();
    await h.flush();
    h.sound.play();
    h.sound.unload();
    h.settle(success);
    await h.flush();
    if (!success) await h.unlock();
    expect(h.starts()).toHaveLength(0);
    expect(h.sound.state()).toBe('unloaded');
  },
);

it('does not let an old context resume change a replacement context', async () => {
  const h = audioHarness();
  await h.flush();
  h.Howler._autoResume();
  h.Howler.ctx = { state: 'suspended' } as AudioContext;
  h.settle(true);
  await h.flush();
  expect(h.Howler.state).toBe('suspended');
});

it('starts only the fresh play when a stopped sound is reused before resume settles', async () => {
  const h = audioHarness();
  await h.flush();
  h.sound.play();
  h.sound.stop();
  h.sound.play();
  h.settle(true);
  await h.flush();
  expect(h.starts()).toHaveLength(1);
  expect(h.sound.playing()).toBe(true);
});

it('clears plays queued during loading after resume failure', async () => {
  const h = audioHarness();
  const id = h.sound.play();
  h.sound.stop(id);
  await h.flush();
  h.settle(false);
  await h.flush();
  await h.unlock();
  expect(h.starts()).toHaveLength(0);
  expect(h.sound._queue).toHaveLength(0);
});

it('passes unexpected resume errors to playerror with the original error', async () => {
  const h = audioHarness();
  await h.flush();
  const failed = vi.fn();
  const unexpected = new Error('Unexpected audio failure');
  h.sound.on('playerror', failed);
  h.sound.play();
  h.settle(false, unexpected);
  await h.flush();
  expect(failed).toHaveBeenCalledWith(null, unexpected);
});

it('keeps ordinary pause/stop controls working independently of resume locks', async () => {
  const h = audioHarness();
  await h.flush();
  h.sound.play();
  h.settle(true);
  await h.flush();
  const first = h.sound.play();
  const second = h.sound.play();
  h.sound.pause(first);
  h.sound.stop(second);
  h.sound.volume(0.4);
  expect(h.sound._playLock).toBe(false);
  expect(h.sound._queue).toHaveLength(0);
  expect(h.sound.volume()).toBe(0.4);
  expect(h.sound.playing(second)).toBe(false);
  h.sound.play(first);
  expect(h.sound.playing(first)).toBe(true);
});
