import { act } from '@testing-library/react';

export const mockAnimationFrame = () => {
  let nextFrame: FrameRequestCallback = () => undefined;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return (time: number) => act(() => nextFrame(time));
};
