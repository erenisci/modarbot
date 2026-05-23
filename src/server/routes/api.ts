import { context, reddit, redis } from '@devvit/web/server';
import { Hono } from 'hono';
import type {
  AnomalyEvent,
  OrbColor,
  SubSettings,
  WatchtowerState,
} from '../../shared/api';
import { recentAnomalies, updateAnomalyStatus } from '../storage/anomalies';
import { ANOMALY_TTL_MS, LEARNING_PERIOD_MS, keys } from '../storage/keys';
import { loadSettings, saveSettings } from '../storage/settings';

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

const subOrFail = (): string => {
  const name = context.subredditName;
  if (!name) throw new Error('No subreddit in context');
  return name;
};

const asThingId = <P extends string>(id: string, prefix: P): `${P}${string}` =>
  (id.startsWith(prefix) ? id : `${prefix}${id}`) as `${P}${string}`;

api.get('/state', async (c) => {
  try {
    const sub = subOrFail();
    const [anomalies, username, installedAt, settings] = await Promise.all([
      recentAnomalies(sub, ANOMALY_TTL_MS),
      reddit.getCurrentUsername(),
      redis.get(keys.installedAt(sub)),
      loadSettings(sub),
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
      settings,
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
  try {
    const sub = subOrFail();
    const id = c.req.param('id');
    const updated = await updateAnomalyStatus(sub, id, 'dismissed');
    if (!updated) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Anomaly not found' },
        404
      );
    }
    return c.json({ type: 'dismiss', anomalyId: id, status: updated.status });
  } catch (error) {
    console.error('dismiss failed:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Dismiss failed' }, 500);
  }
});

api.post('/anomaly/:id/action', async (c) => {
  try {
    const sub = subOrFail();
    const id = c.req.param('id');
    const updated = await updateAnomalyStatus(sub, id, 'actioned');
    if (!updated) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Anomaly not found' },
        404
      );
    }
    return c.json({ type: 'action', anomalyId: id, status: updated.status });
  } catch (error) {
    console.error('action failed:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Action failed' }, 500);
  }
});

type BulkActionRequest = {
  action: 'ban' | 'remove' | 'lock';
  users?: string[];
  posts?: string[];
  threads?: string[];
  reason?: string;
};

api.post('/anomaly/:id/bulk', async (c) => {
  try {
    const sub = subOrFail();
    const id = c.req.param('id');
    const body = await c.req.json<BulkActionRequest>();
    const reason = body.reason ?? `ModarBot bulk action (${id})`;

    if (body.action === 'ban' && body.users) {
      for (const username of body.users.slice(0, 20)) {
        try {
          await reddit.banUser({
            subredditName: sub,
            username,
            reason: 'ModarBot anomaly response',
            note: reason,
          });
        } catch (err) {
          console.error(`ban ${username} failed:`, err);
        }
      }
    }

    if (body.action === 'remove' && body.posts) {
      for (const postId of body.posts.slice(0, 20)) {
        try {
          const post = await reddit.getPostById(asThingId(postId, 't3_'));
          await post.remove();
        } catch (err) {
          console.error(`remove ${postId} failed:`, err);
        }
      }
    }

    if (body.action === 'lock' && body.threads) {
      for (const threadId of body.threads.slice(0, 5)) {
        try {
          const post = await reddit.getPostById(asThingId(threadId, 't3_'));
          await post.lock();
        } catch (err) {
          console.error(`lock ${threadId} failed:`, err);
        }
      }
    }

    const updated = await updateAnomalyStatus(sub, id, 'actioned');
    return c.json({ type: 'bulk', anomalyId: id, status: updated?.status ?? 'actioned' });
  } catch (error) {
    console.error('bulk action failed:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Bulk action failed' }, 500);
  }
});

api.post('/settings', async (c) => {
  try {
    const sub = subOrFail();
    const body = await c.req.json<SubSettings>();
    await saveSettings(sub, body);
    return c.json({ type: 'settings', saved: true });
  } catch (error) {
    console.error('settings save failed:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Settings save failed' }, 500);
  }
});
