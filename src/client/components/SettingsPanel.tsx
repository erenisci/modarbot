import { useState } from 'react';
import type { AnomalyType, SubSettings } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';

const ALL_TYPES: AnomalyType[] = [
  'account_age',
  'report_storm',
  'vote_pattern',
  'comment_cascade',
  'cross_post_influx',
  'new_account_cluster',
];

export const SettingsPanel = ({
  current,
  onClose,
  onSave,
}: {
  current: SubSettings;
  onClose: () => void;
  onSave: (settings: SubSettings) => Promise<void>;
}) => {
  const [draft, setDraft] = useState<SubSettings>({
    ...current,
    thresholds: { ...current.thresholds },
  });
  const [busy, setBusy] = useState(false);

  const updateThreshold = (type: AnomalyType, value: number) => {
    setDraft((d) => ({
      ...d,
      thresholds: { ...d.thresholds, [type]: value },
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              <div>
                <div className="text-sm font-medium text-gray-100">ModarBot enabled</div>
                <div className="text-xs text-gray-500">
                  Disable to pause all ingestion and alerts.
                </div>
              </div>
            </label>
          </section>

          <section>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Alert channel
            </div>
            <select
              value={draft.alertChannel}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  alertChannel: e.target.value as SubSettings['alertChannel'],
                }))
              }
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
            >
              <option value="modmail">Modmail</option>
              <option value="push">Push notification</option>
              <option value="both">Both</option>
              <option value="none">Silent</option>
            </select>
          </section>

          <section>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Per-signal sensitivity
            </div>
            <div className="flex flex-col gap-4">
              {ALL_TYPES.map((type) => {
                const value = draft.thresholds[type] ?? 0.5;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-200">
                        {ANOMALY_LABELS[type]}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={value}
                      onChange={(e) =>
                        updateThreshold(type, parseFloat(e.target.value))
                      }
                      className="w-full accent-rose-500"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Lower = more sensitive (more alerts). Higher = stricter.
            </p>
          </section>
        </div>

        <div className="p-5 border-t border-gray-800 bg-gray-900/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-sm px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={busy}
            className="text-sm px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
