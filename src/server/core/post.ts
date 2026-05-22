import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'ModarBot Watchtower',
    splash: {
      heading: 'ModarBot Watchtower',
      description: 'Real-time anomaly detection. Open to see live status.',
    },
  });
};
