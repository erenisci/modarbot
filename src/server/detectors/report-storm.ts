import type { AnomalyEvent } from '../../shared/api';
import type { RawEvent } from '../storage/events';
import { recentEvents } from '../storage/events';

const WINDOW_MS = 15 * 60 * 1000;
const DISTINCT_REPORTERS_TRIGGER = 5;

export const detectReportStorm = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const events = await recentEvents(subreddit, WINDOW_MS);
  const reports = events.filter(
    (e): e is Extract<RawEvent, { kind: 'report' }> => e.kind === 'report'
  );
  if (reports.length < DISTINCT_REPORTERS_TRIGGER) return [];

  const byTarget = new Map<string, Set<string>>();
  for (const r of reports) {
    if (!r.targetUser || r.targetUser === 'unknown') continue;
    const set = byTarget.get(r.targetUser) ?? new Set<string>();
    set.add(r.reporter);
    byTarget.set(r.targetUser, set);
  }

  const out: AnomalyEvent[] = [];
  for (const [targetUser, reporters] of byTarget) {
    if (reporters.size < DISTINCT_REPORTERS_TRIGGER) continue;
    const severity = Math.min(
      1,
      reporters.size / (DISTINCT_REPORTERS_TRIGGER * 2)
    );
    out.push({
      id: `report_storm:${targetUser}:${Math.floor(Date.now() / WINDOW_MS)}`,
      subreddit,
      type: 'report_storm',
      severity,
      reason: `u/${targetUser} received ${reporters.size} distinct reports in the last 15 minutes.`,
      firedAt: Date.now(),
      entities: { users: [targetUser, ...reporters].slice(0, 20) },
      status: 'active',
    });
  }
  return out;
};
