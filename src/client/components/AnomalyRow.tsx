import type { AnomalyEvent } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';

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

const timeAgo = (firedAt: number): string => {
  const diff = Date.now() - firedAt;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
};

export const AnomalyRow = ({
  anomaly,
  onDismiss,
  onAction,
}: {
  anomaly: AnomalyEvent;
  onDismiss: () => void;
  onAction: () => void;
}) => {
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
        <span className="text-xs text-gray-400">
          {timeAgo(anomaly.firedAt)}
        </span>
      </div>
      <div className="text-sm text-gray-300">{anomaly.reason}</div>
      <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full ${SEVERITY_BAR(anomaly.severity)}`}
          style={{ width: `${Math.round(anomaly.severity * 100)}%` }}
        />
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
    </div>
  );
};
