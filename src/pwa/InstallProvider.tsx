import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { readStoredValue, writeStoredValue } from '@/game/browser-storage';
import { InstallContext } from './install-context';
import { getInstallGuide, isStandalone } from './install-platform';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'quizmon.install-offer-dismissed.v1';

export const InstallProvider = ({ children }: { children: ReactNode }) => {
  const [guide] = useState(getInstallGuide);
  const [installed, setInstalled] = useState(isStandalone);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerDismissed, setOfferDismissed] = useState(
    () => readStoredValue('localStorage', DISMISSED_KEY) === 'true',
  );
  const prompt = useRef<InstallPromptEvent | null>(null);

  const dismissOffer = useCallback(() => {
    setOfferDismissed(true);
    writeStoredValue('localStorage', DISMISSED_KEY, 'true');
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
      setAvailable(true);
      setError(null);
    };
    const onInstalled = () => {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
    };
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => {
      if (isStandalone()) onInstalled();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_KEY)
        setOfferDismissed(event.newValue === 'true');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    displayMode.addEventListener('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
      displayMode.removeEventListener('change', onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    const event = prompt.current;
    if (!event) return;
    // Each browser event can be prompted only once, including after rejection.
    prompt.current = null;
    setBusy(true);
    setError(null);
    try {
      const result = await event.prompt();
      if (result.outcome === 'accepted') setInstalled(true);
      else dismissOffer();
    } catch {
      setError(
        'Installation could not open. Use the install option in your browser menu, or try again when it becomes available.',
      );
    } finally {
      setAvailable(prompt.current !== null);
      setBusy(false);
    }
  }, [dismissOffer]);

  return (
    <InstallContext.Provider
      value={{
        status: installed
          ? 'installed'
          : available
            ? 'native'
            : guide
              ? 'instructions'
              : 'unavailable',
        guide,
        busy,
        error,
        offerDismissed,
        dismissOffer,
        install,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
};
