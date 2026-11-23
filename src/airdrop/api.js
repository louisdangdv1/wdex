import { useEffect, useState } from 'react';
import { useRemote } from '../lib/api';
import { AIRDROP } from './config';

const URL_ = '/.netlify/functions/airdrop';

const post = async (body) => {
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || `HTTP ${r.status}`);
    err.data = data;
    throw err;
  }
  return data;
};

export const fetchAirdropStats = async () => {
  const r = await fetch(`${URL_}?stats=1`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
export const fetchRecord = async (address) => {
  const r = await fetch(`${URL_}?address=${address}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()).record;
};
export const registerWallet = (payload) => post({ action: 'register', ...payload });
export const spinWheel = (address) => post({ action: 'spin', address });

export const useAirdropStats = () => useRemote('airdrop-stats', fetchAirdropStats, { maxAge: 15_000, refresh: 20_000 });

/** Live countdown to a date */
export function useCountdown(target = AIRDROP.end) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, Date.parse(target) - now);
  return {
    ms,
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  };
}

/** Referral code from ?ref=… is remembered across pages */
export const getSavedRef = () => {
  try {
    return localStorage.getItem('wpepe.ref') || '';
  } catch {
    return '';
  }
};
export const saveRefFromUrl = () => {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && /^FROG[0-9A-F]{6,10}$/i.test(ref)) {
    try {
      localStorage.setItem('wpepe.ref', ref.toUpperCase());
    } catch { /* ignore */ }
  }
};
