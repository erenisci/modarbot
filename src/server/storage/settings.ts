import { redis } from '@devvit/web/server';
import type { SubSettings, AnomalyType } from '../../shared/api';
import { DEFAULT_SETTINGS } from '../../shared/api';
import { keys } from './keys';

export const loadSettings = async (sub: string): Promise<SubSettings> => {
  const raw = await redis.hGetAll(keys.settings(sub));
  if (!raw || Object.keys(raw).length === 0) return { ...DEFAULT_SETTINGS };

  const thresholds: Partial<Record<AnomalyType, number>> = { ...DEFAULT_SETTINGS.thresholds };
  for (const key of Object.keys(thresholds) as AnomalyType[]) {
    const v = raw[`threshold_${key}`];
    if (v !== undefined) {
      const n = parseFloat(v);
      if (!isNaN(n)) thresholds[key] = Math.max(0, Math.min(1, n));
    }
  }

  const alertChannel = (raw.alertChannel as SubSettings['alertChannel']) ?? DEFAULT_SETTINGS.alertChannel;
  const enabled = raw.enabled !== undefined ? raw.enabled === 'true' : DEFAULT_SETTINGS.enabled;

  return { thresholds, alertChannel, enabled };
};

export const saveSettings = async (
  sub: string,
  settings: SubSettings
): Promise<void> => {
  const flat: Record<string, string> = {
    alertChannel: settings.alertChannel,
    enabled: String(settings.enabled),
  };
  for (const [key, value] of Object.entries(settings.thresholds)) {
    flat[`threshold_${key}`] = String(value);
  }
  await redis.hSet(keys.settings(sub), flat);
};
