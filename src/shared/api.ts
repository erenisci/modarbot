export type BulkAction = 'ban' | 'remove' | 'lock';

export const REALTIME_CHANNEL_PREFIX = 'modarbot';
export const channelFor = (subreddit: string): string =>
  `${REALTIME_CHANNEL_PREFIX}_${subreddit.replace(/[^a-zA-Z0-9_]/g, '_')}`;

export type AnomalyType =
  | 'account_age'
  | 'report_storm'
  | 'vote_pattern'
  | 'comment_cascade'
  | 'cross_post_influx'
  | 'new_account_cluster';

export type AnomalyEvent = {
  id: string;
  subreddit: string;
  type: AnomalyType;
  severity: number;
  reason: string;
  firedAt: number;
  entities: {
    users?: string[];
    posts?: string[];
    threads?: string[];
  };
  status: 'active' | 'dismissed' | 'actioned';
};

export type OrbColor = 'green' | 'yellow' | 'red';

export type WatchtowerState = {
  type: 'state';
  orb: OrbColor;
  anomalies: AnomalyEvent[];
  subredditName: string;
  modUser: string | null;
  learningUntil: number | null;
  settings: SubSettings;
};

export type DismissResponse = {
  type: 'dismiss';
  anomalyId: string;
  status: 'active' | 'dismissed' | 'actioned';
};

export type SubSettings = {
  thresholds: Partial<Record<AnomalyType, number>>;
  alertChannel: 'modmail' | 'push' | 'both' | 'none';
  enabled: boolean;
};

export const DEFAULT_SETTINGS: SubSettings = {
  thresholds: {
    account_age: 0.35,
    report_storm: 0.3,
    vote_pattern: 0.5,
    comment_cascade: 0.3,
    cross_post_influx: 0.5,
    new_account_cluster: 0.3,
  },
  alertChannel: 'modmail',
  enabled: true,
};

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  account_age: 'New-account flood',
  report_storm: 'Report storm',
  vote_pattern: 'Vote anomaly',
  comment_cascade: 'Comment cascade',
  cross_post_influx: 'External traffic spike',
  new_account_cluster: 'New-account cluster',
};
