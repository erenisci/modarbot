import type { AnomalyEvent } from '../../shared/api';
import { recordAnomaly } from '../storage/anomalies';
import { detectAccountAge } from './account-age';
import { detectCommentCascade } from './comment-cascade';
import { detectCrossPostInflux } from './cross-post-influx';
import { detectNewAccountCluster } from './new-account-cluster';
import { detectReportStorm } from './report-storm';

const allDetectors = [
  detectAccountAge,
  detectReportStorm,
  detectCommentCascade,
  detectNewAccountCluster,
  detectCrossPostInflux,
];

export const runDetectors = async (
  subreddit: string
): Promise<AnomalyEvent[]> => {
  const results = await Promise.allSettled(
    allDetectors.map((run) => run(subreddit))
  );

  const fresh: AnomalyEvent[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`Detector failed: ${result.reason}`);
      continue;
    }
    for (const anomaly of result.value) {
      if (await recordAnomaly(anomaly)) fresh.push(anomaly);
    }
  }
  return fresh;
};
