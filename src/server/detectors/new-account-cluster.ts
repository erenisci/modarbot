import type { AnomalyEvent } from '../../shared/api';
import type { RawEvent } from '../storage/events';
import { recentEvents } from '../storage/events';

const WINDOW_MS = 30 * 60 * 1000;
const CLUSTER_MIN_ACCOUNTS = 4;
const CLUSTER_AGE_SPREAD_MS = 14 * 24 * 60 * 60 * 1000;

type Authored = Extract<RawEvent, { kind: 'post' | 'comment' }>;

export const detectNewAccountCluster = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const events = await recentEvents(subreddit, WINDOW_MS);
  const authored = events.filter(
    (e): e is Authored =>
      (e.kind === 'post' || e.kind === 'comment') && !!e.threadId
  );
  if (authored.length < CLUSTER_MIN_ACCOUNTS) return [];

  const byThread = new Map<string, Map<string, number>>();
  for (const e of authored) {
    if (!e.authorCreatedAt || e.author === 'unknown') continue;
    const authors = byThread.get(e.threadId) ?? new Map<string, number>();
    if (!authors.has(e.author)) authors.set(e.author, e.authorCreatedAt);
    byThread.set(e.threadId, authors);
  }

  const out: AnomalyEvent[] = [];
  for (const [threadId, authors] of byThread) {
    if (authors.size < CLUSTER_MIN_ACCOUNTS) continue;
    const ages = [...authors.entries()].sort((a, b) => a[1] - b[1]);

    let bestStart = 0;
    let bestSize = 0;
    let bestUsers: string[] = [];
    for (let i = 0; i < ages.length; i++) {
      const start = ages[i];
      if (!start) continue;
      let j = i;
      while (j < ages.length) {
        const candidate = ages[j];
        if (!candidate || candidate[1] - start[1] > CLUSTER_AGE_SPREAD_MS)
          break;
        j++;
      }
      const size = j - i;
      if (size > bestSize) {
        bestSize = size;
        bestStart = i;
        bestUsers = ages.slice(i, j).map((entry) => entry[0]);
      }
    }

    if (bestSize < CLUSTER_MIN_ACCOUNTS) continue;
    const first = ages[bestStart];
    const last = ages[bestStart + bestSize - 1];
    if (!first || !last) continue;
    const spreadDays = Math.ceil((last[1] - first[1]) / (24 * 60 * 60 * 1000));
    const severity = Math.min(1, bestSize / (CLUSTER_MIN_ACCOUNTS * 2));

    out.push({
      id: `new_account_cluster:${threadId}:${Math.floor(Date.now() / WINDOW_MS)}`,
      subreddit,
      type: 'new_account_cluster',
      severity,
      reason: `${bestSize} accounts created within ${spreadDays} days of each other are active in the same thread.`,
      firedAt: Date.now(),
      entities: { threads: [threadId], users: bestUsers.slice(0, 20) },
      status: 'active',
    });
  }
  return out;
};
