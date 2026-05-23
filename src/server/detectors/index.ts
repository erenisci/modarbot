import type { AnomalyEvent } from '../../shared/api';
import { recordAnomaly } from '../storage/anomalies';
import { detectAccountAge } from './account-age';
import { detectReportStorm } from './report-storm';
import { detectCommentCascade } from './comment-cascade';
import { detectNewAccountCluster } from './new-account-cluster';

const allDetectors = [
  detectAccountAge,
  detectReportStorm,
  detectCommentCascade,
  detectNewAccountCluster,
];

export const runDetectors = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const fresh: AnomalyEvent[] = [];

  for (const run of allDetectors) {
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
