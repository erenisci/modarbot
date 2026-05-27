import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AnomalyEvent } from '../shared/api';
import { AnomalyRow } from './components/AnomalyRow';
import { DrillDown } from './components/DrillDown';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusOrb } from './components/StatusOrb';
import { Toast } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useWatchtower } from './hooks/useWatchtower';

const formatLearningCountdown = (until: number): string => {
  const ms = until - Date.now();
  if (ms <= 0) return 'ready';
  const hrs = Math.ceil(ms / 3_600_000);
  return `${hrs}h until full coverage`;
};

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-950 text-gray-100">
    <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="h-8 w-2/3 bg-gray-800/60 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-gray-800/40 rounded animate-pulse" />
      </header>
      <section className="flex flex-col items-center py-6 gap-3">
        <div className="w-32 h-32 rounded-full bg-gray-800/60 animate-pulse" />
        <div className="h-4 w-32 bg-gray-800/40 rounded animate-pulse" />
      </section>
      <section className="flex flex-col gap-3">
        <div className="h-16 bg-gray-900/40 border border-dashed border-gray-800 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-900/40 border border-dashed border-gray-800 rounded-lg animate-pulse" />
      </section>
    </div>
  </div>
);

export const App = () => {
  const { toast, show } = useToast();
  const {
    status,
    state,
    error,
    dismiss,
    reactivate,
    actionTaken,
    bulkAction,
    saveSettings,
    fireDemoAlarm,
  } = useWatchtower();
  const [drillDown, setDrillDown] = useState<AnomalyEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (status === 'loading') return <LoadingSkeleton />;

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

  const handleDismiss = async (anomaly: AnomalyEvent) => {
    await dismiss(anomaly);
    show('Anomaly dismissed', 'info');
  };

  const handleBulk = async (
    anomaly: AnomalyEvent,
    action: 'ban' | 'remove' | 'lock'
  ) => {
    await bulkAction(anomaly, action);
    await actionTaken(anomaly);
    show(`${action} action applied`, 'success');
  };

  const handleSaveSettings = async (settings: typeof state.settings) => {
    await saveSettings(settings);
    show('Settings saved', 'success');
  };

  const handleFireDemo: typeof fireDemoAlarm = async (type, severity) => {
    try {
      await fireDemoAlarm(type, severity);
      show('Synthetic alarm fired', 'info');
    } catch {
      show('Slow down — demo throttled', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              ModarBot Watchtower
            </h1>
            <p className="text-sm text-gray-400">
              r/{state.subredditName}
              {state.modUser ? ` · ${state.modUser}` : ''}
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            Settings
          </button>
        </header>

        <section className="flex flex-col items-center py-6">
          <StatusOrb color={state.orb} />
          {state.learningUntil && (
            <p className="mt-4 text-xs text-amber-300/80 text-center max-w-sm">
              ModarBot is learning this sub's normal patterns —{' '}
              {formatLearningCountdown(state.learningUntil)}.
            </p>
          )}
          {!state.settings.enabled && (
            <p className="mt-4 text-xs text-rose-300 text-center max-w-sm">
              ModarBot is paused. Open settings to re-enable.
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
                  subredditName={state.subredditName}
                  onDismiss={() => handleDismiss(anomaly)}
                  onAction={() => setDrillDown(anomaly)}
                  onReactivate={async () => {
                    await reactivate(anomaly);
                    show('Anomaly re-activated', 'info');
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="text-xs text-gray-600 text-center pt-4">
          ModarBot · catch the raid before it catches you
        </footer>
      </div>

      {drillDown && (
        <DrillDown
          anomaly={drillDown}
          onClose={() => setDrillDown(null)}
          onBulkAction={(action) => handleBulk(drillDown, action)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          current={state.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
          onFireDemo={handleFireDemo}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
