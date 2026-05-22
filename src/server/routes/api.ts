import { context, reddit, redis } from '@devvit/web/server';
import { Hono } from 'hono';
import type { AnomalyEvent, OrbColor, WatchtowerState } from '../../shared/api';
import { recentAnomalies, updateAnomalyStatus } from '../storage/anomalies';
import { ANOMALY_TTL_MS, LEARNING_PERIOD_MS, keys } from '../storage/keys';

type ErrorResponse = { status: 'error'; message: string };

export const api = new Hono();

const orbFromAnomalies = (anomalies: AnomalyEvent[]): OrbColor => {
  const active = anomalies.filter((a) => a.status === 'active');
  if (active.length === 0) return 'green';
  const maxSev = Math.max(...active.map((a) => a.severity));
  if (maxSev > 0.7) return 'red';
  if (maxSev > 0.3) return 'yellow';
  return 'green';
};

api.get('/state', async (c) => {
  const sub = context.subredditName;
  if (!sub) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'No subreddit in context' },
      400
    );
  }
  try {
    const [anomalies, username, installedAt] = await Promise.all([
      recentAnomalies(sub, ANOMALY_TTL_MS),
      reddit.getCurrentUsername(),
      redis.get(keys.installedAt(sub)),
    ]);

    const installedAtMs = installedAt ? parseInt(installedAt, 10) : null;
    const learningUntil =
      installedAtMs && Date.now() - installedAtMs < LEARNING_PERIOD_MS
        ? installedAtMs + LEARNING_PERIOD_MS
        : null;

    return c.json<WatchtowerState>({
      type: 'state',
      orb: orbFromAnomalies(anomalies),
      anomalies,
      subredditName: sub,
      modUser: username ?? null,
      learningUntil,
    });
  } catch (error) {
    console.error('GET /api/state failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load state' },
      500
    );
  }
});

api.post('/anomaly/:id/dismiss', async (c) => {
  const sub = context.subredditName;
  const id = c.req.param('id');
  if (!sub) {
    return c.json<ErrorResponse>({ status: 'error', message: 'No sub' }, 400);
  }
  const updated = await updateAnomalyStatus(sub, id, 'dismissed');
  if (!updated) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Anomaly not found' },
      404
    );
  }
  return c.json({ type: 'dismiss', anomalyId: id, status: updated.status });
});

api.post('/anomaly/:id/action', async (c) => {
  const sub = context.subredditName;
  const id = c.req.param('id');
  if (!sub) {
    return c.json<ErrorResponse>({ status: 'error', message: 'No sub' }, 400);
  }
  const updated = await updateAnomalyStatus(sub, id, 'actioned');
  if (!updated) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Anomaly not found' },
      404
    );
  }
  return c.json({ type: 'action', anomalyId: id, status: updated.status });
});
