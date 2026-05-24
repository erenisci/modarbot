import { useEffect, useState } from 'react';

const REFRESH_MS = 30_000;

const format = (firedAt: number): string => {
  const diff = Date.now() - firedAt;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / (24 * 3_600_000))}d ago`;
};

export const useTimeAgo = (firedAt: number): string => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return format(firedAt);
};
