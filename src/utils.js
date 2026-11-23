import { useSyncExternalStore } from 'react';
import { ex } from './engine/exchange';

/** Re-render the component on every engine tick */
export const useTick = () => useSyncExternalStore(ex.subscribe, ex.getVersion);

export const fmt = (n, dp = 2) =>
  n == null || !isFinite(n)
    ? '--'
    : Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtCompact = (n) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);

export const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

export const fmtTime = (t) => new Date(t).toLocaleTimeString('en-GB', { hour12: false });

export const fmtDateTime = (t) =>
  new Date(t).toLocaleString('en-GB', { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const cls = (n) => (n >= 0 ? 'up' : 'down');
