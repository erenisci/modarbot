export const keys = {
  events: (sub: string) => `modarbot:${sub}:events`,
  baseline: (sub: string, kind: string) => `modarbot:${sub}:baseline:${kind}`,
  anomalies: (sub: string) => `modarbot:${sub}:anomalies`,
  settings: (sub: string) => `modarbot:${sub}:settings`,
  dedupe: (sub: string, type: string, key: string) =>
    `modarbot:${sub}:dedupe:${type}:${key}`,
  installedAt: (sub: string) => `modarbot:${sub}:installed-at`,
};

export const EVENT_LOG_TTL_MS = 24 * 60 * 60 * 1000;
export const ANOMALY_TTL_MS = 48 * 60 * 60 * 1000;
export const LEARNING_PERIOD_MS = 24 * 60 * 60 * 1000;
export const DEDUPE_MS = 10 * 60 * 1000;
