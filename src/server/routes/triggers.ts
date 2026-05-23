import { context, redis } from '@devvit/web/server';
import { Hono } from 'hono';
import { currentOrb } from '../core/orb';
import { createPost } from '../core/post';
import { runDetectors } from '../detectors';
import {
  ingestCommentSubmit,
  ingestModAction,
  ingestPostSubmit,
  ingestReport,
} from '../ingest/handlers';
import { dispatchAlerts } from '../notify/modmail';
import { publishAnomalies, publishOrb } from '../realtime/publish';
import { keys } from '../storage/keys';
import { loadSettings } from '../storage/settings';

type TriggerResponse = {
  status: 'success' | 'error';
  message?: string;
};

export const triggers = new Hono();

const subOrFail = (): string => {
  const name = context.subredditName;
  if (!name) throw new Error('subredditName missing from context');
  return name;
};

const cycle = async (sub: string): Promise<void> => {
  const settings = await loadSettings(sub);
  if (!settings.enabled) return;
  const fresh = await runDetectors(sub);
  if (fresh.length === 0) return;
  await Promise.all([
    publishAnomalies(sub, fresh),
    currentOrb(sub).then((orb) => publishOrb(sub, orb)),
    dispatchAlerts(sub, fresh, settings),
  ]);
};

triggers.post('/on-app-install', async (c) => {
  try {
    const sub = subOrFail();
    await redis.set(keys.installedAt(sub), Date.now().toString());
    const post = await createPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `ModarBot Watchtower created at ${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error('on-app-install failed:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create Watchtower post' },
      400
    );
  }
});

triggers.post('/on-post-submit', async (c) => {
  try {
    const sub = subOrFail();
    await ingestPostSubmit(sub, await c.req.json());
    await cycle(sub);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('on-post-submit failed:', error);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-comment-submit', async (c) => {
  try {
    const sub = subOrFail();
    await ingestCommentSubmit(sub, await c.req.json());
    await cycle(sub);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('on-comment-submit failed:', error);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-post-report', async (c) => {
  try {
    const sub = subOrFail();
    await ingestReport(sub, await c.req.json());
    await cycle(sub);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('on-post-report failed:', error);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-comment-report', async (c) => {
  try {
    const sub = subOrFail();
    await ingestReport(sub, await c.req.json());
    await cycle(sub);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('on-comment-report failed:', error);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});

triggers.post('/on-mod-action', async (c) => {
  try {
    const sub = subOrFail();
    await ingestModAction(sub, await c.req.json());
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (error) {
    console.error('on-mod-action failed:', error);
    return c.json<TriggerResponse>({ status: 'error' }, 400);
  }
});
