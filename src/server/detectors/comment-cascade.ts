import type { AnomalyEvent } from '../../shared/api';
import type { RawEvent } from '../storage/events';
import { recentEvents } from '../storage/events';

const RECENT_WINDOW_MS = 10 * 60 * 1000;
const PRIOR_WINDOW_MS = 30 * 60 * 1000;
const MIN_RECENT_COMMENTS = 8;
const BURST_FACTOR = 5;

export const detectCommentCascade = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const lookbackMs = RECENT_WINDOW_MS + PRIOR_WINDOW_MS;
  const events = await recentEvents(subreddit, lookbackMs);
  const comments = events.filter(
    (e): e is Extract<RawEvent, { kind: 'comment' }> => e.kind === 'comment'
  );
  if (comments.length === 0) return [];

  const now = Date.now();
  const recentCutoff = now - RECENT_WINDOW_MS;
  const priorCutoff = now - lookbackMs;

  const recentByThread = new Map<
    string,
    Extract<RawEvent, { kind: 'comment' }>[]
  >();
  const priorByThread = new Map<string, number>();

  for (const c of comments) {
    if (!c.threadId) continue;
    if (c.postedAt >= recentCutoff) {
      const arr = recentByThread.get(c.threadId) ?? [];
      arr.push(c);
      recentByThread.set(c.threadId, arr);
    } else if (c.postedAt >= priorCutoff) {
      priorByThread.set(c.threadId, (priorByThread.get(c.threadId) ?? 0) + 1);
    }
  }

  const out: AnomalyEvent[] = [];
  for (const [threadId, recentComments] of recentByThread) {
    if (recentComments.length < MIN_RECENT_COMMENTS) continue;
    const recentRate = recentComments.length / (RECENT_WINDOW_MS / 60_000);
    const priorRate =
      (priorByThread.get(threadId) ?? 0) / (PRIOR_WINDOW_MS / 60_000);
    if (priorRate > 0 && recentRate < priorRate * BURST_FACTOR) continue;

    const burst = priorRate > 0 ? recentRate / priorRate : recentRate;
    const severity = Math.min(1, burst / (BURST_FACTOR * 2));
    const users = [...new Set(recentComments.map((c) => c.author))].slice(
      0,
      20
    );

    out.push({
      id: `comment_cascade:${threadId}:${Math.floor(now / RECENT_WINDOW_MS)}`,
      subreddit,
      type: 'comment_cascade',
      severity,
      reason: `${recentComments.length} comments on this thread in 10 minutes — ${Math.round(burst)}× the prior pace.`,
      firedAt: now,
      entities: { threads: [threadId], users },
      status: 'active',
    });
  }
  return out;
};
