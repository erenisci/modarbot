import { realtime } from '@devvit/web/server';
import type { JsonValue } from '@devvit/web/shared';
import type { AnomalyEvent, OrbColor } from '../../shared/api';

const channel = (sub: string) => `modarbot:${sub}`;

export const publishAnomalies = async (
  sub: string,
  anomalies: AnomalyEvent[]
): Promise<void> => {
  for (const anomaly of anomalies) {
    await safeSend(channel(sub), {
      kind: 'anomaly',
      anomaly,
    } as unknown as JsonValue);
  }
};

export const publishOrb = async (sub: string, orb: OrbColor): Promise<void> => {
  await safeSend(channel(sub), {
    kind: 'status_update',
    orb,
  } as unknown as JsonValue);
};

const safeSend = async (ch: string, data: JsonValue): Promise<void> => {
  try {
    await realtime.send(ch, data);
  } catch (error) {
    console.error(`realtime send failed (${ch}): ${error}`);
  }
};
