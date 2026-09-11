import { reloadAfterUpdate } from '@/features/installation/update-session';
import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const AutomaticUpdate = ({ allowed }: { allowed: boolean }) => {
  const [readyToReload, setReadyToReload] = useState(false);
  const [retry, setRetry] = useState(0);
  const requested = useRef(false);
  const reloading = useRef(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload: () => setReadyToReload(true),
    onRegisteredSW: (_url, registration) => setRegistration(registration),
  });

  useEffect(() => {
    if (!allowed || !registration) return;
    const check = () => {
      void registration.update().catch(() => undefined);
    };
    check();
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
    };
  }, [allowed, registration]);

  useEffect(() => {
    if (!allowed || reloading.current) return;
    let cancelled = false;
    let timeout: number | undefined;
    const retryLater = () => {
      if (!cancelled)
        timeout = window.setTimeout(
          () => setRetry((value) => value + 1),
          30_000,
        );
    };
    if (readyToReload) {
      reloading.current = reloadAfterUpdate();
      if (!reloading.current) retryLater();
    } else if (needRefresh && !requested.current) {
      requested.current = true;
      void updateServiceWorker().catch(() => {
        requested.current = false;
        retryLater();
      });
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [allowed, needRefresh, readyToReload, retry, updateServiceWorker]);

  return null;
};
