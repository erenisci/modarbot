import type { OrbColor } from '../../shared/api';

const ORB_STYLES: Record<
  OrbColor,
  { ring: string; glow: string; label: string }
> = {
  green: {
    ring: 'bg-emerald-500 shadow-emerald-500/40',
    glow: 'shadow-[0_0_60px_rgba(16,185,129,0.45)]',
    label: 'All quiet',
  },
  yellow: {
    ring: 'bg-amber-400 shadow-amber-400/50',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.55)] animate-pulse',
    label: 'Watch',
  },
  red: {
    ring: 'bg-rose-500 shadow-rose-500/60',
    glow: 'shadow-[0_0_80px_rgba(244,63,94,0.7)] animate-pulse',
    label: 'Alert',
  },
};

export const StatusOrb = ({ color }: { color: OrbColor }) => {
  const style = ORB_STYLES[color];
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`w-32 h-32 rounded-full ${style.ring} ${style.glow} transition-all duration-500`}
        aria-label={`ModarBot status: ${style.label}`}
      />
      <div className="text-lg font-semibold tracking-wide text-gray-900 dark:text-white uppercase">
        {style.label}
      </div>
    </div>
  );
};
