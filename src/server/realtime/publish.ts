import { realtime } from '@devvit/web/server';
import type { JsonValue } from '@devvit/web/shared';
import type { AnomalyEvent, OrbColor } from '../../shared/api';
import { channelFor } from '../../shared/api';

export const publishAnomalies = async (
  sub: string,
  anomalies: AnomalyEvent[]
): Promise<void> => {
  const channel = channelFor(sub);
  await Promise.all(
    anomalies.map((anomaly) =>
      safeSend(channel, { kind: 'anomaly', anomaly } as unknown as JsonValue)
    )
  );
};

export const publishOrb = async (sub: string, orb: OrbColor): Promise<void> => {
  await safeSend(channelFor(sub), {
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
