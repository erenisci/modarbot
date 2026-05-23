import { useState } from 'react';
import type { AnomalyEvent } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';

type BulkAction = 'ban' | 'remove' | 'lock';

export const DrillDown = ({
  anomaly,
  onClose,
  onBulkAction,
}: {
  anomaly: AnomalyEvent;
  onClose: () => void;
  onBulkAction: (action: BulkAction) => Promise<void>;
}) => {
  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState(false);

  const users = anomaly.entities.users ?? [];
  const posts = anomaly.entities.posts ?? [];
  const threads = anomaly.entities.threads ?? [];

  const run = async (action: BulkAction) => {
    setBusy(true);
    try {
      await onBulkAction(action);
      onClose();
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-rose-400 mb-1">
              Investigate
            </div>
            <h2 className="text-lg font-semibold text-gray-100">
              {ANOMALY_LABELS[anomaly.type]}
            </h2>
            <p className="text-sm text-gray-400 mt-1">{anomaly.reason}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {users.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Accounts ({users.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {users.slice(0, 30).map((u) => (
                  <a
                    key={u}
                    href={`https://reddit.com/u/${u}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
                  >
                    u/{u}
                  </a>
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Posts ({posts.length})
              </div>
              <div className="flex flex-col gap-1">
                {posts.slice(0, 10).map((p) => (
                  <code key={p} className="text-xs text-gray-300 font-mono">
                    {p}
                  </code>
                ))}
              </div>
            </section>
          )}

          {threads.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Threads ({threads.length})
              </div>
              <div className="flex flex-col gap-1">
                {threads.slice(0, 5).map((t) => (
                  <code key={t} className="text-xs text-gray-300 font-mono">
                    {t}
                  </code>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-5 border-t border-gray-800 bg-gray-900/60">
          {confirming === null ? (
            <div className="flex flex-wrap gap-2">
              {users.length > 0 && (
                <button
                  onClick={() => setConfirming('ban')}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 disabled:opacity-50"
                >
                  Ban {users.length} {users.length === 1 ? 'user' : 'users'}
                </button>
              )}
              {posts.length > 0 && (
                <button
                  onClick={() => setConfirming('remove')}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 disabled:opacity-50"
                >
                  Remove {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </button>
              )}
              {threads.length > 0 && (
                <button
                  onClick={() => setConfirming('lock')}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/40 disabled:opacity-50"
                >
                  Lock {threads.length === 1 ? 'thread' : `${threads.length} threads`}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-amber-200">
                Confirm: <strong>{confirming}</strong> action will execute immediately and cannot be undone in bulk.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void run(confirming)}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-medium disabled:opacity-50"
                >
                  {busy ? 'Working…' : `Yes, ${confirming}`}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
