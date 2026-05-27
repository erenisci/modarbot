import { context, reddit, redis } from '@devvit/web/server';
import { Hono } from 'hono';
import type {
  BulkAction,
  SubSettings,
  WatchtowerState,
} from '../../shared/api';
import { requireMod } from '../core/auth';
import { orbFromAnomalies } from '../core/orb';
import { recentAnomalies, updateAnomalyStatus } from '../storage/anomalies';
import { ANOMALY_TTL_MS, LEARNING_PERIOD_MS, keys } from '../storage/keys';
import { loadSettings, saveSettings } from '../storage/settings';

type ErrorResponse = { status: 'error'; message: string };

export const api = new Hono();

const subOrFail = (): string => {
  const name = context.subredditName;
  if (!name) throw new Error('No subreddit in context');
  return name;
};

const asThingId = <P extends string>(id: string, prefix: P): `${P}${string}` =>
  (id.startsWith(prefix) ? id : `${prefix}${id}`) as `${P}${string}`;

const findAnomaly = async (sub: string, id: string) => {
  const all = await recentAnomalies(sub, ANOMALY_TTL_MS);
  return all.find((a) => a.id === id) ?? null;
};

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

api.post('/anomaly/:id/dismiss', requireMod, async (c) => {
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
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Dismiss failed' },
      500
    );
  }
});

api.post('/anomaly/:id/reactivate', requireMod, async (c) => {
  try {
    const sub = subOrFail();
    const id = c.req.param('id');
    const updated = await updateAnomalyStatus(sub, id, 'active');
    if (!updated) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Anomaly not found' },
        404
      );
    }
    return c.json({ type: 'reactivate', anomalyId: id, status: updated.status });
  } catch (error) {
    console.error('reactivate failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Reactivate failed' },
      500
    );
  }
});

api.post('/anomaly/:id/action', requireMod, async (c) => {
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
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Action failed' },
      500
    );
  }
});

type BulkActionRequest = {
  action: BulkAction;
  reason?: string;
};

const intersect = (
  fromClient: string[] | undefined,
  fromAnomaly: string[] | undefined
): string[] => {
  if (!fromClient || !fromAnomaly) return [];
  const allowed = new Set(fromAnomaly);
  return fromClient.filter((x) => allowed.has(x));
};

api.post('/anomaly/:id/bulk', requireMod, async (c) => {
  try {
    const sub = subOrFail();
    const id = c.req.param('id');
    const anomaly = await findAnomaly(sub, id);
    if (!anomaly) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Anomaly not found' },
        404
      );
    }

    const body = await c.req.json<
      BulkActionRequest & {
        users?: string[];
        posts?: string[];
        threads?: string[];
      }
    >();
    const reason = body.reason ?? `ModarBot bulk action (${id})`;

    const allowedUsers = intersect(body.users, anomaly.entities.users);
    const allowedPosts = intersect(body.posts, anomaly.entities.posts);
    const allowedThreads = intersect(body.threads, anomaly.entities.threads);

    if (body.action === 'ban' && allowedUsers.length > 0) {
      await Promise.allSettled(
        allowedUsers.slice(0, 20).map((username) =>
          reddit
            .banUser({
              subredditName: sub,
              username,
              reason: 'ModarBot anomaly response',
              note: reason,
            })
            .catch((err) => console.error(`ban ${username} failed:`, err))
        )
      );
    }

    if (body.action === 'remove' && allowedPosts.length > 0) {
      await Promise.allSettled(
        allowedPosts.slice(0, 20).map(async (postId) => {
          try {
            const post = await reddit.getPostById(asThingId(postId, 't3_'));
            await post.remove();
          } catch (err) {
            console.error(`remove ${postId} failed:`, err);
          }
        })
      );
    }

    if (body.action === 'lock' && allowedThreads.length > 0) {
      await Promise.allSettled(
        allowedThreads.slice(0, 5).map(async (threadId) => {
          try {
            const post = await reddit.getPostById(asThingId(threadId, 't3_'));
            await post.lock();
          } catch (err) {
            console.error(`lock ${threadId} failed:`, err);
          }
        })
      );
    }

    const updated = await updateAnomalyStatus(sub, id, 'actioned');
    return c.json({
      type: 'bulk',
      anomalyId: id,
      status: updated?.status ?? 'actioned',
      acted: {
        users: allowedUsers.length,
        posts: allowedPosts.length,
        threads: allowedThreads.length,
      },
    });
  } catch (error) {
    console.error('bulk action failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Bulk action failed' },
      500
    );
  }
});

api.post('/settings', requireMod, async (c) => {
  try {
    const sub = subOrFail();
    const body = await c.req.json<SubSettings>();
    await saveSettings(sub, body);
    return c.json({ type: 'settings', saved: true });
  } catch (error) {
    console.error('settings save failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Settings save failed' },
      500
    );
  }
});
