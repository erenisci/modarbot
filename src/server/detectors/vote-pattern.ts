import type { AnomalyEvent } from '../../shared/api';
import type { VoteSnapshot } from '../storage/vote-snapshots';

const MIN_RATIO_DROP = 0.2;
const MIN_AGE_MS = 5 * 60 * 1000;
const MAX_POST_AGE_MS = 12 * 60 * 60 * 1000;
const MIN_SCORE = 5;

export const detectVotePattern = (
  subreddit: string,
  current: VoteSnapshot[],
  previousByPost: Map<string, VoteSnapshot>
): AnomalyEvent[] => {
  const now = Date.now();
  const out: AnomalyEvent[] = [];

  for (const snap of current) {
    const prev = previousByPost.get(snap.postId);
    if (!prev) continue;
    if (snap.takenAt - prev.takenAt < MIN_AGE_MS) continue;
    if (now - snap.postedAt > MAX_POST_AGE_MS) continue;
    if (snap.score < MIN_SCORE && prev.score < MIN_SCORE) continue;

    const drop = prev.ratio - snap.ratio;
    if (drop < MIN_RATIO_DROP) continue;

    const severity = Math.min(1, drop / 0.5);
    out.push({
      id: `vote_pattern:${snap.postId}:${Math.floor(now / (5 * 60 * 1000))}`,
      subreddit,
      type: 'vote_pattern',
      severity,
      reason: `Post upvote ratio dropped from ${Math.round(prev.ratio * 100)}% to ${Math.round(snap.ratio * 100)}% in ${Math.round((snap.takenAt - prev.takenAt) / 60_000)} minutes.`,
      firedAt: now,
      entities: { posts: [snap.postId] },
      status: 'active',
    });
  }
  return out;
};
