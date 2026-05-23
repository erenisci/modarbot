import { redis } from '@devvit/web/server';
import { EVENT_LOG_TTL_MS, keys } from './keys';

export type RawEvent =
  | {
      kind: 'post';
      id: string;
      author: string;
      authorCreatedAt: number;
      postedAt: number;
      threadId: string;
      url?: string;
      crosspostParentId?: string;
    }
  | {
      kind: 'comment';
      id: string;
      author: string;
      authorCreatedAt: number;
      postedAt: number;
      parentId: string;
      threadId: string;
    }
  | {
      kind: 'report';
      id: string;
      reporter: string;
      targetUser: string;
      targetId: string;
      reason: string;
      reportedAt: number;
    }
  | {
      kind: 'modAction';
      actor: string;
      action: string;
      targetId: string;
      at: number;
    };

export const appendEvent = async (
  sub: string,
  event: RawEvent
): Promise<void> => {
  const now = Date.now();
  const member = JSON.stringify({ ...event, _ts: now });
  await redis.zAdd(keys.events(sub), { score: now, member });
  await redis.zRemRangeByScore(keys.events(sub), 0, now - EVENT_LOG_TTL_MS);
};

export const recentEvents = async (
  sub: string,
  windowMs: number
): Promise<RawEvent[]> => {
  const now = Date.now();
  const raw = await redis.zRange(keys.events(sub), now - windowMs, now, {
    by: 'score',
  });
  return raw
    .map((entry) => {
      try {
        return JSON.parse(entry.member) as RawEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is RawEvent => e !== null);
};
