import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AnomalyRow } from './components/AnomalyRow';
import { StatusOrb } from './components/StatusOrb';
import { useWatchtower } from './hooks/useWatchtower';

const formatLearningCountdown = (until: number): string => {
  const ms = until - Date.now();
  if (ms <= 0) return 'ready';
  const hrs = Math.ceil(ms / 3_600_000);
  return `${hrs}h until full coverage`;
};

export const App = () => {
  const { status, state, error, dismiss, actionTaken } = useWatchtower();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
        Loading ModarBot Watchtower…
      </div>
    );
  }

  if (status === 'error' || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-rose-300">
        <div className="max-w-md text-center">
          <div className="font-semibold mb-2">Watchtower offline</div>
          <div className="text-sm text-rose-200/70">
            {error ?? 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  const active = state.anomalies.filter((a) => a.status === 'active');
  const handled = state.anomalies.filter((a) => a.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">
        <header className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            ModarBot Watchtower
          </h1>
          <p className="text-sm text-gray-400">
            r/{state.subredditName}
            {state.modUser ? ` · ${state.modUser}` : ''}
          </p>
        </header>

        <section className="flex flex-col items-center py-6">
          <StatusOrb color={state.orb} />
          {state.learningUntil && (
            <p className="mt-4 text-xs text-amber-300/80 text-center max-w-sm">
              ModarBot is learning this sub's normal patterns —{' '}
              {formatLearningCountdown(state.learningUntil)}.
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-wider text-gray-400">
              Live anomalies
            </h2>
            <span className="text-xs text-gray-500">
              {active.length} active · {handled.length} handled
            </span>
          </div>
          {state.anomalies.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
              No anomalies yet. ModarBot will surface unusual patterns the
              moment they appear.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {state.anomalies.map((anomaly) => (
                <AnomalyRow
                  key={anomaly.id}
                  anomaly={anomaly}
                  onDismiss={() => dismiss(anomaly)}
                  onAction={() => actionTaken(anomaly)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="text-xs text-gray-600 text-center pt-4">
          ModarBot · catch the raid before it catches you
        </footer>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
