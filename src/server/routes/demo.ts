import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { AnomalyEvent, AnomalyType } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';
import { recordAnomaly } from '../storage/anomalies';
import { publishAnomalies, publishOrb } from '../realtime/publish';
import { loadSettings } from '../storage/settings';
import { dispatchAlerts } from '../notify/modmail';
import { recentAnomalies } from '../storage/anomalies';
import { ANOMALY_TTL_MS } from '../storage/keys';

type ErrorResponse = { status: 'error'; message: string };

export const demo = new Hono();

const SYNTHETIC_REASONS: Record<AnomalyType, string> = {
  account_age:
    '7 accounts under 30 days old posted in the last 10 minutes (87% of authors, baseline 12%).',
  report_storm:
    'u/synthetic_target received 6 distinct reports in the last 15 minutes.',
  vote_pattern:
    'Synthetic vote-pattern anomaly for demo purposes.',
  comment_cascade:
    '14 comments on this thread in 10 minutes — 8× the prior pace.',
  cross_post_influx:
    'Synthetic cross-post influx for demo purposes.',
  new_account_cluster:
    '5 accounts created within 9 days of each other are active in the same thread.',
};

const SYNTHETIC_ENTITIES = {
  users: ['demo_sock1', 'demo_sock2', 'demo_sock3', 'demo_sock4', 'demo_sock5'],
  threads: ['demo_thread_t3_synthetic'],
};

demo.post('/trigger', async (c) => {
  const sub = context.subredditName;
  if (!sub) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'No subreddit in context' },
      400
    );
  }
  const body: { type?: AnomalyType; severity?: number } = await c.req
    .json<{ type?: AnomalyType; severity?: number }>()
    .catch(() => ({}));
  const type: AnomalyType = body.type ?? 'comment_cascade';
  const severity = Math.min(1, Math.max(0, body.severity ?? 0.85));

  const anomaly: AnomalyEvent = {
    id: `demo:${type}:${Date.now()}`,
    subreddit: sub,
    type,
    severity,
    reason: `[Demo] ${SYNTHETIC_REASONS[type]}`,
    firedAt: Date.now(),
    entities: SYNTHETIC_ENTITIES,
    status: 'active',
  };

  await recordAnomaly(anomaly);
  await publishAnomalies(sub, [anomaly]);

  const recent = await recentAnomalies(sub, ANOMALY_TTL_MS);
  const active = recent.filter((a) => a.status === 'active');
  const maxSev = active.length === 0 ? 0 : Math.max(...active.map((a) => a.severity));
  const orb = maxSev > 0.7 ? 'red' : maxSev > 0.3 ? 'yellow' : 'green';
  await publishOrb(sub, orb);

  const settings = await loadSettings(sub);
  await dispatchAlerts(sub, [anomaly], settings);

  return c.json({ type: 'demo_fired', anomalyId: anomaly.id, label: ANOMALY_LABELS[type] });
});

demo.post('/reset', async (c) => {
  const sub = context.subredditName;
  if (!sub) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'No subreddit in context' },
      400
    );
  }
  await publishOrb(sub, 'green');
  return c.json({ type: 'demo_reset' });
});
