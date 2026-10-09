import { useEffect, useLayoutEffect, useRef } from 'react';
import { Sentry } from '../lib/sentry';

export function useQueryReadySpan(
  name: 'rankings.ready' | 'trainer.ready',
  key: string,
  enabled: boolean,
  ready: boolean,
  failed: boolean,
  cached: boolean,
) {
  const current = useRef<{
    key: string;
    span: ReturnType<typeof Sentry.startInactiveSpan>;
    ended: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    if (!enabled || current.current?.key !== key) {
      current.current?.span.end();
      current.current = null;
    }
    if (!enabled) return;
    current.current ??= {
      key,
      span: Sentry.startInactiveSpan({
        name,
        op: 'ui.load',
        attributes: { 'query.cached': cached },
      }),
      ended: false,
    };
    if (!current.current.ended && (ready || failed)) {
      if (failed) current.current.span.setStatus({ code: 2, message: 'error' });
      current.current.span.end();
      current.current.ended = true;
    }
  }, [name, key, enabled, ready, failed, cached]);
  useEffect(
    () => () => {
      current.current?.span.end();
      current.current = null;
    },
    [],
  );
}
