import { redis } from '@devvit/web/server';
import type { AnomalyEvent } from '../../shared/api';
import { ANOMALY_TTL_MS, DEDUPE_MS, keys } from './keys';

export const recordAnomaly = async (
  anomaly: AnomalyEvent
): Promise<boolean> => {
  const dedupeKey = keys.dedupe(anomaly.subreddit, anomaly.type, anomaly.id);
  const existed = await redis.get(dedupeKey);
  if (existed) return false;
  await redis.set(dedupeKey, '1', {
    expiration: new Date(Date.now() + DEDUPE_MS),
  });

  const member = JSON.stringify(anomaly);
  await redis.zAdd(keys.anomalies(anomaly.subreddit), {
    score: anomaly.firedAt,
    member,
  });
  await redis.zRemRangeByScore(
    keys.anomalies(anomaly.subreddit),
    0,
    Date.now() - ANOMALY_TTL_MS
  );
  return true;
};

export const recentAnomalies = async (
  sub: string,
  windowMs: number
): Promise<AnomalyEvent[]> => {
  const now = Date.now();
  const raw = await redis.zRange(keys.anomalies(sub), now - windowMs, now, {
    by: 'score',
  });
  return raw
    .map((entry) => {
      try {
        return JSON.parse(entry.member) as AnomalyEvent;
      } catch {
        return null;
      }
    })
    .filter((a): a is AnomalyEvent => a !== null)
    .reverse();
};

export const updateAnomalyStatus = async (
  sub: string,
  anomalyId: string,
  status: AnomalyEvent['status']
): Promise<AnomalyEvent | null> => {
  const all = await recentAnomalies(sub, ANOMALY_TTL_MS);
  const target = all.find((a) => a.id === anomalyId);
  if (!target) return null;
  const oldMember = JSON.stringify({ ...target });
  const updated = { ...target, status };
  await redis.zRem(keys.anomalies(sub), [oldMember]);
  await redis.zAdd(keys.anomalies(sub), {
    score: target.firedAt,
    member: JSON.stringify(updated),
  });
  return updated;
};
