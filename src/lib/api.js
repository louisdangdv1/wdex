import { useEffect, useState } from 'react';

// Small cached fetch layer shared by every page.
const cache = new Map(); // key -> { data, time, promise }

async function load(key, fn, maxAge) {
  const c = cache.get(key);
  if (c?.data && Date.now() - c.time < maxAge) return c.data;
  if (c?.promise) return c.promise;
  const promise = fn()
    .then((data) => {
      cache.set(key, { data, time: Date.now() });
      return data;
    })
    .catch((e) => {
      cache.set(key, { ...(c || {}), promise: null });
      throw e;
    });
  cache.set(key, { ...(c || {}), promise });
  return promise;
}

/** React hook: cached + auto-refreshing remote data */
export function useRemote(key, fn, { maxAge = 5 * 60_000, refresh = 5 * 60_000 } = {}) {
  const [state, setState] = useState(() => {
    const c = cache.get(key);
    return { data: c?.data ?? null, error: null, loading: !c?.data, updated: c?.time ?? null };
  });
  useEffect(() => {
    let alive = true;
    const run = (force) => {
      if (force) cache.delete(key);
      load(key, fn, maxAge)
        .then((data) => alive && setState({ data, error: null, loading: false, updated: cache.get(key)?.time ?? Date.now() }))
        .catch((error) => alive && setState((s) => ({ ...s, error, loading: false })));
    };
    run(false);
    const t = setInterval(() => run(true), refresh);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);
  return state;
}

const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export const fetchNews = () => getJson('/.netlify/functions/news');

export const fetchGlobal = async () => {
  const { data } = await getJson('https://api.coingecko.com/api/v3/global');
  return {
    marketCap: data.total_market_cap.usd,
    volume: data.total_volume.usd,
    btcDom: data.market_cap_percentage.btc,
    ethDom: data.market_cap_percentage.eth,
    change: data.market_cap_change_percentage_24h_usd,
    coins: data.active_cryptocurrencies,
    markets: data.markets,
  };
};

export const fetchFearGreed = async () => {
  const { data } = await getJson('https://api.alternative.me/fng/?limit=30');
  return data.map((d) => ({ value: +d.value, label: d.value_classification, time: +d.timestamp * 1000 }));
};

export const fetchUsdVnd = async () => {
  const d = await getJson('https://open.er-api.com/v6/latest/USD');
  return d.rates?.VND ?? 25500;
};

export const timeAgo = (t) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const coinIcon = (base) =>
  `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${base.toLowerCase()}.svg`;
