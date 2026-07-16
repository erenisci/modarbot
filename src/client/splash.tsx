import React from 'react';
import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OrbColor, WatchtowerState } from '../shared/api';

const ORB_BG: Record<OrbColor, string> = {
  green: 'bg-emerald-500 shadow-emerald-500/50',
  yellow: 'bg-amber-400 shadow-amber-400/60 animate-pulse',
  red: 'bg-rose-500 shadow-rose-500/70 animate-pulse',
};

const ORB_LABEL: Record<OrbColor, string> = {
  green: 'All quiet',
  yellow: 'Watch',
  red: 'Alert',
};

const openWatchtower = (e: React.MouseEvent) => {
  try {
    requestExpandedMode(e.nativeEvent, 'game');
  } catch {
    window.location.href = '/game.html';
  }
};

export const Splash = () => {
  const [orb, setOrb] = useState<OrbColor>('green');
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const json = (await res.json()) as WatchtowerState;
        setOrb(json.orb);
        setActiveCount(
          json.anomalies.filter((a) => a.status === 'active').length
        );
      } catch {
        // silent
      }
    };
    void load();
  }, []);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-3 bg-gray-950 text-gray-100">
      <div className="relative flex items-center justify-center w-28 h-28">
        <span className="absolute inset-0 rounded-full border border-dashed border-gray-700/60" />
        <span className="absolute inset-3 rounded-full border border-dashed border-gray-700/40" />
        <div
          className={`w-20 h-20 rounded-full ${ORB_BG[orb]} shadow-[0_0_50px] transition-all duration-500`}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-bold">ModarBot Watchtower</h1>
        <p className="text-sm text-gray-300">
          {ORB_LABEL[orb]}
          {activeCount > 0 ? ` · ${activeCount} active` : ''}
        </p>
      </div>
      <button
        className="mt-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 h-10 text-sm font-medium transition-colors"
        onClick={openWatchtower}
      >
        Open Watchtower
      </button>
      <p className="absolute bottom-4 text-xs text-gray-600">
        Catch the raid before it catches you
      </p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
