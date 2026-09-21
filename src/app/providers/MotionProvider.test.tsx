import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import { MotionProvider } from './MotionProvider';
import { useReducedMotion } from './motion-context';

function MotionState() {
  return <span>{useReducedMotion() ? 'reduced' : 'full'}</span>;
}

test.each([true, false])('uses the device motion preference %s', (matches) => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches }) });
  try {
    expect(
      renderToStaticMarkup(
        <MotionProvider>
          <MotionState />
        </MotionProvider>,
      ),
    ).toContain(matches ? 'reduced' : 'full');
  } finally {
    vi.unstubAllGlobals();
  }
});
