import { navigateTo } from '@devvit/web/client';
import type { AnomalyEvent } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';
import { useTimeAgo } from '../hooks/useTimeAgo';

const STATUS_CHIP: Record<AnomalyEvent['status'], string> = {
  active: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  dismissed: 'bg-gray-500/15 text-gray-300 border-gray-500/40',
  actioned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

const SEVERITY_BAR = (severity: number): string => {
  if (severity > 0.7) return 'bg-rose-500';
  if (severity > 0.3) return 'bg-amber-400';
  return 'bg-emerald-500';
};

export const AnomalyRow = ({
  anomaly,
  subredditName,
  onDismiss,
  onAction,
  onReactivate,
}: {
  anomaly: AnomalyEvent;
  subredditName: string;
  onDismiss: () => void;
  onAction: () => void;
  onReactivate?: () => void;
}) => {
  const when = useTimeAgo(anomaly.firedAt);
  const severityPct = Math.round(anomaly.severity * 100);
  const threads = anomaly.entities.threads ?? [];

  return (
    <div className="border border-gray-800 rounded-lg p-3 bg-gray-900/40 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded border ${STATUS_CHIP[anomaly.status]}`}
          >
            {anomaly.status}
          </span>
          <span className="font-semibold text-gray-100">
            {ANOMALY_LABELS[anomaly.type]}
          </span>
        </div>
        <span className="text-xs text-gray-400">{when}</span>
      </div>
      <div className="text-sm text-gray-300">{anomaly.reason}</div>

      {threads.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {threads.slice(0, 3).map((threadId) => (
            <button
              key={threadId}
              onClick={() =>
                navigateTo(
                  `https://reddit.com/r/${subredditName}/comments/${threadId}`
                )
              }
              className="text-xs px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors"
            >
              📎 Thread
            </button>
          ))}
        </div>
      )}

      <div
        role="meter"
        aria-label="Anomaly severity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={severityPct}
        aria-valuetext={`${severityPct}% severity`}
        className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden"
      >
        <div
          className={`h-full ${SEVERITY_BAR(anomaly.severity)}`}
          style={{ width: `${severityPct}%` }}
        />
        <span className="sr-only">Severity {severityPct}%</span>
      </div>

      {anomaly.status === 'active' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onAction}
            className="text-xs px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors"
          >
            Investigate
          </button>
          <button
            onClick={onDismiss}
            className="text-xs px-3 py-1 rounded bg-gray-700/40 hover:bg-gray-700/60 text-gray-200 border border-gray-600/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {anomaly.status === 'dismissed' && onReactivate && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onReactivate}
            className="text-xs px-3 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 transition-colors"
          >
            Re-investigate
          </button>
        </div>
      )}
    </div>
  );
};
