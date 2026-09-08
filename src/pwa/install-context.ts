import { createContext, useContext } from 'react';
import type { InstallGuide } from './install-platform';

export interface InstallContextValue {
  status: 'unavailable' | 'native' | 'instructions' | 'installed';
  guide: InstallGuide | null;
  busy: boolean;
  error: string | null;
  offerDismissed: boolean;
  dismissOffer: () => void;
  install: () => Promise<void>;
}

export const InstallContext = createContext<InstallContextValue>({
  status: 'unavailable',
  guide: null,
  busy: false,
  error: null,
  offerDismissed: false,
  dismissOffer: () => undefined,
  install: () => Promise.resolve(),
});

export const useInstall = () => useContext(InstallContext);
