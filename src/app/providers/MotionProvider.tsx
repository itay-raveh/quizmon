import { useEffect, useState, type ReactNode } from 'react';
import { ReducedMotionContext } from './motion-context';

interface MotionProviderProps {
  children: ReactNode;
}

export const MotionProvider = ({ children }: MotionProviderProps) => {
  const [devicePrefersReducedMotion, setDevicePrefersReducedMotion] = useState(
    () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
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
      devicePrefersReducedMotion,
    );
    return () => document.documentElement.removeAttribute('data-reduce-motion');
  }, [devicePrefersReducedMotion]);

  return (
    <ReducedMotionContext value={devicePrefersReducedMotion}>
      {children}
    </ReducedMotionContext>
  );
};
