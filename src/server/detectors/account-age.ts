import type { AnomalyEvent } from '../../shared/api';
import { readBaseline, stddev, updateBaseline } from '../storage/baselines';
import type { RawEvent } from '../storage/events';
import { recentEvents } from '../storage/events';

const WINDOW_MS = 10 * 60 * 1000;
const NEW_ACCOUNT_THRESHOLD_DAYS = 30;
const MIN_WINDOW_POSTERS = 5;
const SIGMA_TRIGGER = 3;

export const detectAccountAge = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const events = await recentEvents(subreddit, WINDOW_MS);
  const authored = events.filter(
    (e): e is Extract<RawEvent, { kind: 'post' | 'comment' }> =>
      e.kind === 'post' || e.kind === 'comment'
  );

  if (authored.length < MIN_WINDOW_POSTERS) return [];

  const newAccountCutoff =
    Date.now() - NEW_ACCOUNT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const distinctAuthors = new Set(authored.map((e) => e.author));
  const newAuthors = new Set(
    authored
      .filter((e) => e.authorCreatedAt >= newAccountCutoff)
      .map((e) => e.author)
  );

  const share = newAuthors.size / distinctAuthors.size;
  const baseline = await readBaseline(subreddit, 'account_age_share');
  const sd = stddev(baseline);
  await updateBaseline(subreddit, 'account_age_share', share);

  if (baseline.count < 10) return [];

  const delta = share - baseline.mean;
  if (sd === 0 || delta < SIGMA_TRIGGER * sd) return [];

  const severity = Math.min(1, delta / (SIGMA_TRIGGER * sd) / 2);
  const newAuthorList = [...newAuthors];

  return [
    {
      id: `account_age:${Math.floor(Date.now() / WINDOW_MS)}`,
      subreddit,
      type: 'account_age',
      severity,
      reason: `${newAuthors.size} accounts under ${NEW_ACCOUNT_THRESHOLD_DAYS} days old posted in the last 10 minutes (${Math.round(share * 100)}% of authors, baseline ${Math.round(baseline.mean * 100)}%).`,
      firedAt: Date.now(),
      entities: { users: newAuthorList.slice(0, 20) },
      status: 'active',
    },
  ];
};
