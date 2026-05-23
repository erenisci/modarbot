import { redis } from '@devvit/web/server';

const TTL_MS = 24 * 60 * 60 * 1000;

export type VoteSnapshot = {
  postId: string;
  ratio: number;
  score: number;
  takenAt: number;
  postedAt: number;
};

const key = (sub: string) => `modarbot:${sub}:vote-snapshots`;

export const saveSnapshots = async (
  sub: string,
  snapshots: VoteSnapshot[]
): Promise<void> => {
  if (snapshots.length === 0) return;
  const entries: Record<string, string> = {};
  for (const snap of snapshots) {
    entries[snap.postId] = JSON.stringify(snap);
  }
  await redis.hSet(key(sub), entries);
};

export const loadSnapshots = async (sub: string): Promise<VoteSnapshot[]> => {
  const raw = await redis.hGetAll(key(sub));
  if (!raw) return [];
  const out: VoteSnapshot[] = [];
  const now = Date.now();
  const stale: string[] = [];
  for (const [postId, value] of Object.entries(raw)) {
    try {
      const snap = JSON.parse(value) as VoteSnapshot;
      if (now - snap.takenAt > TTL_MS) {
        stale.push(postId);
        continue;
      }
      out.push(snap);
    } catch {
      stale.push(postId);
    }
  }
  if (stale.length > 0) await redis.hDel(key(sub), stale);
  return out;
};
