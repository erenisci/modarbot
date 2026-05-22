import { redis } from '@devvit/web/server';
import { keys } from './keys';

const EWMA_ALPHA = 0.05;

export const readBaseline = async (
  sub: string,
  kind: string
): Promise<{ mean: number; m2: number; count: number }> => {
  const raw = await redis.hGetAll(keys.baseline(sub, kind));
  return {
    mean: parseFloat(raw.mean ?? '0') || 0,
    m2: parseFloat(raw.m2 ?? '0') || 0,
    count: parseInt(raw.count ?? '0', 10) || 0,
  };
};

export const updateBaseline = async (
  sub: string,
  kind: string,
  sample: number
): Promise<void> => {
  const prev = await readBaseline(sub, kind);
  const count = prev.count + 1;
  const newMean = prev.mean + EWMA_ALPHA * (sample - prev.mean);
  const newM2 =
    prev.m2 +
    EWMA_ALPHA * ((sample - prev.mean) * (sample - newMean) - prev.m2);
  await redis.hSet(keys.baseline(sub, kind), {
    mean: newMean.toString(),
    m2: newM2.toString(),
    count: count.toString(),
  });
};

export const stddev = (b: {
  mean: number;
  m2: number;
  count: number;
}): number => (b.count < 2 ? 0 : Math.sqrt(Math.max(b.m2, 0)));
