import { connectRealtime, disconnectRealtime } from '@devvit/web/client';
import { useEffect, useRef, useState } from 'react';
import type {
  AnomalyEvent,
  AnomalyType,
  BulkAction,
  SubSettings,
  WatchtowerState,
} from '../../shared/api';
import { channelFor } from '../../shared/api';

type Status = 'loading' | 'ready' | 'error';

const POLL_MS = 15_000;

export const useWatchtower = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [state, setState] = useState<WatchtowerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const subscribedChannel = useRef<string | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WatchtowerState;
      setState(json);
      setStatus('ready');
      setError(null);
      return json;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load state');
      return null;
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
      if (subscribedChannel.current) {
        disconnectRealtime(subscribedChannel.current);
        subscribedChannel.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!state?.subredditName) return;
    const channel = channelFor(state.subredditName);
    if (subscribedChannel.current === channel) return;
    if (subscribedChannel.current)
      disconnectRealtime(subscribedChannel.current);

    connectRealtime({
      channel,
      onMessage: () => {
        void fetchState();
      },
    });
    subscribedChannel.current = channel;
  }, [state?.subredditName]);

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

  const reactivate = async (anomaly: AnomalyEvent) => {
    await fetch(`/api/anomaly/${encodeURIComponent(anomaly.id)}/reactivate`, {
      method: 'POST',
    });
    await fetchState();
  };

  const bulkAction = async (anomaly: AnomalyEvent, action: BulkAction) => {
    await fetch(`/api/anomaly/${encodeURIComponent(anomaly.id)}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        users: anomaly.entities.users,
        posts: anomaly.entities.posts,
        threads: anomaly.entities.threads,
      }),
    });
    await fetchState();
  };

  const saveSettings = async (settings: SubSettings) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    await fetchState();
  };

  const fireDemoAlarm = async (
    type: AnomalyType = 'comment_cascade',
    severity = 0.85
  ) => {
    await fetch('/api/demo/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, severity }),
    });
    await fetchState();
  };

  return {
    status,
    state,
    error,
    refresh: fetchState,
    dismiss,
    reactivate,
    actionTaken,
    bulkAction,
    saveSettings,
    fireDemoAlarm,
  };
};
