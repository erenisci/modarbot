import type { AnomalyEvent } from '../../shared/api';
import { recordAnomaly } from '../storage/anomalies';
import { detectAccountAge } from './account-age';

export const runDetectors = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const detectors = [detectAccountAge];
  const fresh: AnomalyEvent[] = [];

  for (const run of detectors) {
    try {
      const found = await run(subreddit);
      for (const anomaly of found) {
        const isNew = await recordAnomaly(anomaly);
        if (isNew) fresh.push(anomaly);
      }
    } catch (error) {
      console.error(`Detector failed: ${error}`);
    }
  }

  return fresh;
};
