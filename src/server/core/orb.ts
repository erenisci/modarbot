import type { AnomalyEvent, OrbColor } from '../../shared/api';

const ORB_WINDOW_MS = 30 * 60 * 1000;

export const orbFromAnomalies = (anomalies: AnomalyEvent[]): OrbColor => {
  const now = Date.now();
  const recent = anomalies.filter(
    (a) => a.status === 'active' && now - a.firedAt <= ORB_WINDOW_MS
  );
  if (recent.length === 0) return 'green';
  const peak = Math.max(...recent.map((a) => a.severity));
  if (peak >= 0.7) return 'red';
  if (peak >= 0.3) return 'yellow';
  return 'green';
};
