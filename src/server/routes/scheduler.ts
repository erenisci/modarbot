import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import { recordAnomaly } from '../storage/anomalies';
import { recentAnomalies } from '../storage/anomalies';
import { ANOMALY_TTL_MS } from '../storage/keys';
import { loadSettings } from '../storage/settings';
import { dispatchAlerts } from '../notify/modmail';
import { publishAnomalies, publishOrb } from '../realtime/publish';
import { detectVotePattern } from '../detectors/vote-pattern';
import {
  loadSnapshots,
  saveSnapshots,
  type VoteSnapshot,
} from '../storage/vote-snapshots';
import type { OrbColor } from '../../shared/api';

type TaskResponse = Record<string, never>;

export const scheduler = new Hono();

const MAX_POSTS = 30;
const MAX_POST_AGE_MS = 24 * 60 * 60 * 1000;

const stripT3 = (id: string): string => id.replace(/^t3_/, '');

const orbFromActive = async (sub: string): Promise<OrbColor> => {
  const anomalies = await recentAnomalies(sub, ANOMALY_TTL_MS);
  const active = anomalies.filter((a) => a.status === 'active');
  if (active.length === 0) return 'green';
  const maxSev = Math.max(...active.map((a) => a.severity));
  if (maxSev > 0.7) return 'red';
  if (maxSev > 0.3) return 'yellow';
  return 'green';
};

scheduler.post('/vote-snapshot', async (c) => {
  const sub = context.subredditName;
  if (!sub) {
    console.error('vote-snapshot: no subreddit in context');
    return c.json<TaskResponse>({}, 200);
  }

  try {
    const settings = await loadSettings(sub);
    if (!settings.enabled) return c.json<TaskResponse>({}, 200);

    const listing = reddit.getNewPosts({
      subredditName: sub,
      limit: MAX_POSTS,
    });
    const posts = await listing.all();
    const now = Date.now();

    const current: VoteSnapshot[] = [];
    for (const post of posts) {
      const createdAt = post.createdAt instanceof Date
        ? post.createdAt.getTime()
        : Date.parse(String(post.createdAt));
      if (!Number.isFinite(createdAt)) continue;
      if (now - createdAt > MAX_POST_AGE_MS) continue;

      const score = typeof post.score === 'number' ? post.score : 0;
      const numComments = typeof post.numberOfComments === 'number'
        ? post.numberOfComments
        : 0;
      // Reddit's PostV2 doesn't expose downs; derive ratio from upvote_ratio when available
      const ratio = typeof (post as unknown as { upvoteRatio?: number }).upvoteRatio === 'number'
        ? (post as unknown as { upvoteRatio: number }).upvoteRatio
        : score >= 0
          ? 1
          : 0;

      current.push({
        postId: stripT3(post.id),
        ratio,
        score,
        takenAt: now,
        postedAt: createdAt,
      });

      // Suppress unused warning while keeping the field accessible to the detector evolution.
      void numComments;
    }

    if (current.length === 0) return c.json<TaskResponse>({}, 200);

    const previousList = await loadSnapshots(sub);
    const previousByPost = new Map(previousList.map((s) => [s.postId, s]));

    const fresh = detectVotePattern(sub, current, previousByPost);
    const newlyRecorded: typeof fresh = [];
    for (const anomaly of fresh) {
      if (await recordAnomaly(anomaly)) newlyRecorded.push(anomaly);
    }

    await saveSnapshots(sub, current);

    if (newlyRecorded.length > 0) {
      await publishAnomalies(sub, newlyRecorded);
      await publishOrb(sub, await orbFromActive(sub));
      await dispatchAlerts(sub, newlyRecorded, settings);
    }
  } catch (error) {
    console.error('vote-snapshot failed:', error);
  }
  return c.json<TaskResponse>({}, 200);
});
