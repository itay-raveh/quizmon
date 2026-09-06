import { useEffect, useState, type ReactNode } from 'react';
import { ReducedMotionContext } from './motion';

interface MotionProviderProps {
  children: ReactNode;
  reduceMotion: boolean;
}

export const MotionProvider = ({
  children,
  reduceMotion,
}: MotionProviderProps) => {
  const [devicePrefersReducedMotion, setDevicePrefersReducedMotion] = useState(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const reducedMotion = reduceMotion || devicePrefersReducedMotion;

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updatePreference = () =>
      setDevicePrefersReducedMotion(preference?.matches ?? false);
    preference?.addEventListener?.('change', updatePreference);
    return () => preference?.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      'data-reduce-motion',
      reducedMotion,
    );
    return () => document.documentElement.removeAttribute('data-reduce-motion');
  }, [reducedMotion]);

  return (
    <ReducedMotionContext.Provider value={reducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  );
};
