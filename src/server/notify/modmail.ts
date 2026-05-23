import { reddit, redis } from '@devvit/web/server';
import type { AnomalyEvent, SubSettings } from '../../shared/api';
import { ANOMALY_LABELS } from '../../shared/api';
import { keys } from '../storage/keys';

const THROTTLE_MS = 10 * 60 * 1000;

const throttleKey = (sub: string, type: AnomalyEvent['type']): string =>
  `${keys.dedupe(sub, 'modmail', type)}`;

export const dispatchAlerts = async (
  sub: string,
  fresh: AnomalyEvent[],
  settings: SubSettings
): Promise<void> => {
  if (!settings.enabled || settings.alertChannel === 'none') return;

  for (const anomaly of fresh) {
    const threshold = settings.thresholds[anomaly.type] ?? 0.5;
    if (anomaly.severity < threshold) continue;

    const tKey = throttleKey(sub, anomaly.type);
    const already = await redis.get(tKey);
    if (already) continue;
    await redis.set(tKey, '1', {
      expiration: new Date(Date.now() + THROTTLE_MS),
    });

    try {
      await reddit.modMail.createConversation({
        subredditName: sub,
        subject: `ModarBot alert: ${ANOMALY_LABELS[anomaly.type]}`,
        body: buildBody(anomaly),
        to: null,
      });
    } catch (error) {
      console.error(`modmail dispatch failed: ${error}`);
    }
  }
};

const buildBody = (anomaly: AnomalyEvent): string => {
  const label = ANOMALY_LABELS[anomaly.type];
  const sev = Math.round(anomaly.severity * 100);
  const users = anomaly.entities.users ?? [];
  const threads = anomaly.entities.threads ?? [];

  const lines = [
    `**${label}** · severity ${sev}%`,
    '',
    anomaly.reason,
    '',
    'Open the **ModarBot Watchtower** post for details and one-click bulk actions.',
  ];

  if (users.length > 0) {
    lines.push(
      '',
      `_Accounts involved:_ ${users
        .slice(0, 8)
        .map((u) => `u/${u}`)
        .join(', ')}${users.length > 8 ? `, +${users.length - 8} more` : ''}`
    );
  }
  if (threads.length > 0) {
    lines.push('', `_Threads:_ ${threads.slice(0, 3).join(', ')}`);
  }
  return lines.join('\n');
};
