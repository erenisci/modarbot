import type { Context as HonoContext, MiddlewareHandler } from 'hono';
import { context, reddit } from '@devvit/web/server';

type ErrorBody = { status: 'error'; message: string };

const isModeratorOf = async (
  subredditName: string,
  username: string
): Promise<boolean> => {
  try {
    const mods = await reddit
      .getModerators({ subredditName, username })
      .all();
    return mods.some((m) => m.username.toLowerCase() === username.toLowerCase());
  } catch (err) {
    console.error(`getModerators(${subredditName}, ${username}) failed:`, err);
    return false;
  }
};

const denyJson = (c: HonoContext, status: 401 | 403, message: string) =>
  c.json<ErrorBody>({ status: 'error', message }, status);

export const requireMod: MiddlewareHandler = async (c, next) => {
  const sub = context.subredditName;
  if (!sub) return denyJson(c, 403, 'No subreddit in context');

  const username = await reddit.getCurrentUsername();
  if (!username) return denyJson(c, 401, 'Sign in required');

  if (!(await isModeratorOf(sub, username))) {
    return denyJson(c, 403, 'Moderator permission required');
  }

  await next();
};
