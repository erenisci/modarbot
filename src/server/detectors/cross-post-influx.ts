import type { AnomalyEvent } from '../../shared/api';
import type { RawEvent } from '../storage/events';
import { recentEvents } from '../storage/events';
import { readBaseline, stddev, updateBaseline } from '../storage/baselines';

const WINDOW_MS = 15 * 60 * 1000;
const MIN_WINDOW_POSTS = 5;
const SIGMA_TRIGGER = 3;

const isExternalRedditReference = (url: string | undefined, sub: string): boolean => {
  if (!url) return false;
  if (!/reddit\.com\/r\//i.test(url)) return false;
  const match = url.match(/reddit\.com\/r\/([^/?#]+)/i);
  const referencedSub = match?.[1];
  return !!referencedSub && referencedSub.toLowerCase() !== sub.toLowerCase();
};

export const detectCrossPostInflux = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const events = await recentEvents(subreddit, WINDOW_MS);
  const posts = events.filter(
    (e): e is Extract<RawEvent, { kind: 'post' }> => e.kind === 'post'
  );
  if (posts.length < MIN_WINDOW_POSTS) return [];

  const inbound = posts.filter(
    (p) => !!p.crosspostParentId || isExternalRedditReference(p.url, subreddit)
  );
  const share = inbound.length / posts.length;

  const baseline = await readBaseline(subreddit, 'cross_post_share');
  const sd = stddev(baseline);
  await updateBaseline(subreddit, 'cross_post_share', share);

  if (baseline.count < 10) return [];
  const delta = share - baseline.mean;
  if (sd === 0 || delta < SIGMA_TRIGGER * sd) return [];

  const severity = Math.min(1, delta / (SIGMA_TRIGGER * sd) / 2);
  const postIds = inbound.map((p) => p.id).slice(0, 20);

  return [
    {
      id: `cross_post_influx:${Math.floor(Date.now() / WINDOW_MS)}`,
      subreddit,
      type: 'cross_post_influx',
      severity,
      reason: `${inbound.length} of the last ${posts.length} posts (${Math.round(share * 100)}%) reference external subreddits — baseline ${Math.round(baseline.mean * 100)}%.`,
      firedAt: Date.now(),
      entities: { posts: postIds },
      status: 'active',
    },
  ];
};
