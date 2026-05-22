import { useEffect, useRef, useState } from 'react';
import type { AnomalyEvent, WatchtowerState } from '../../shared/api';

type Status = 'loading' | 'ready' | 'error';

const POLL_MS = 5000;

export const useWatchtower = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [state, setState] = useState<WatchtowerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WatchtowerState;
      setState(json);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load state');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const safeFetch = async () => {
      if (cancelled) return;
      await fetchState();
    };
    void safeFetch();
    timer.current = window.setInterval(safeFetch, POLL_MS);
    return () => {
      cancelled = true;
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  const dismiss = async (anomaly: AnomalyEvent) => {
    await fetch(`/api/anomaly/${encodeURIComponent(anomaly.id)}/dismiss`, {
      method: 'POST',
    });
    await fetchState();
  };

  const actionTaken = async (anomaly: AnomalyEvent) => {
    await fetch(`/api/anomaly/${encodeURIComponent(anomaly.id)}/action`, {
      method: 'POST',
    });
    await fetchState();
  };

  return { status, state, error, refresh: fetchState, dismiss, actionTaken };
};
