import { context } from '@devvit/web/server';
import { Hono } from 'hono';
import { createPost } from '../core/post';

type UiResponse = { navigateTo?: string; showToast?: string };

export const menu = new Hono();

menu.post('/watchtower-open', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error('watchtower-open failed:', error);
    return c.json<UiResponse>(
      { showToast: 'Could not open Watchtower. Try again.' },
      400
    );
  }
});
