import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ex, MARKETS, SYMBOLS } from '../engine/exchange';
import { useRemote, fetchGlobal, fetchFearGreed } from '../lib/api';
import { fmt, fmtPct, cls } from '../utils';
import { CoinIcon, FearGreedGauge, Sparkline, fmtShort } from '../components/common';

const FAV_KEY = 'wdex.favs';
const loadFavs = () => {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
};

const TABS = [
  ['all', 'All'],
  ['fav', '⭐ Favorites'],
  ['gainers', 'Gainers'],
  ['losers', 'Losers'],
];
const COLS = [
  ['name', 'Pair'],
  ['price', 'Price'],
  ['change', '24h Change'],
  ['high', '24h High'],
  ['low', '24h Low'],
  ['volume', '24h Volume'],
];

export default function Markets() {
  const navigate = useNavigate();
  const global = useRemote('global', fetchGlobal, { maxAge: 120_000, refresh: 120_000 });
  const fng = useRemote('fng', fetchFearGreed, { maxAge: 600_000, refresh: 600_000 });
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(['volume', -1]);
  const [favs, setFavs] = useState(loadFavs);

  const toggleFav = (s) => {
    const next = favs.includes(s) ? favs.filter((x) => x !== s) : [...favs, s];
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const rows = SYMBOLS.map((s) => {
    const st = ex.stats24(s);
    return { sym: s, name: MARKETS[s].base, price: ex.mk[s].price, change: st.change, high: st.high, low: st.low, volume: st.volume };
  })
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (tab === 'fav' ? favs.includes(r.sym) : tab === 'gainers' ? r.change > 0 : tab === 'losers' ? r.change < 0 : true));
  const [key, dir] = tab === 'gainers' ? ['change', -1] : tab === 'losers' ? ['change', 1] : sort;
  rows.sort((a, b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key]) * dir);

  const g = global.data;
  const hist = fng.data || [];
  const up = SYMBOLS.filter((s) => ex.stats24(s).change >= 0).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Markets</h1>
          <p className="muted">Live prices of every perpetual on WDex, plus the global crypto market.</p>
        </div>
      </div>

      <div className="stat-cards market-stats">
        <div className="stat-card">
          <label>Global market cap</label>
          <b>{g ? `$${fmtShort(g.marketCap)}` : '–'}</b>
          {g && <span className={cls(g.change)}>{fmtPct(g.change)} 24h</span>}
        </div>
        <div className="stat-card">
          <label>24h volume (all crypto)</label>
          <b>{g ? `$${fmtShort(g.volume)}` : '–'}</b>
        </div>
        <div className="stat-card">
          <label>BTC / ETH dominance</label>
          <b>{g ? `${g.btcDom.toFixed(1)}% / ${g.ethDom.toFixed(1)}%` : '–'}</b>
        </div>
        <div className="stat-card">
          <label>WDex markets up / down</label>
          <b><span className="up">{up}</span> / <span className="down">{SYMBOLS.length - up}</span></b>
        </div>
        <div className="stat-card">
          <label>Fear &amp; Greed</label>
          <b>{hist[0] ? `${hist[0].value} · ${hist[0].label}` : '–'}</b>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-tools">
          <div className="tabs-inline">
            {TABS.map(([k, l]) => (
              <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <input className="search-input" placeholder="Search coin…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-scroll">
          <table className="markets-table">
            <thead>
              <tr>
                <th />
                {COLS.map(([k, l]) => (
                  <th key={k} className="sortable" onClick={() => setSort(([sk, sd]) => [k, sk === k ? -sd : -1])}>
                    {l} {sort[0] === k && tab !== 'gainers' && tab !== 'losers' ? (sort[1] > 0 ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th>Last 24h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">{tab === 'fav' ? 'Tap ☆ to add favourites' : 'No markets found'}</td>
                </tr>
              )}
              {rows.map((r) => {
                const cfg = MARKETS[r.sym];
                return (
                  <tr key={r.sym} className="clickable" onClick={() => navigate(`/trade/${r.sym}`)}>
                    <td>
                      <button
                        className={`star ${favs.includes(r.sym) ? 'on' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleFav(r.sym); }}
                        aria-label="Favourite"
                      >
                        {favs.includes(r.sym) ? '★' : '☆'}
                      </button>
                    </td>
                    <td>
                      <span className="pair-cell">
                        <CoinIcon base={cfg.base} size={24} />
                        <b>{cfg.base}</b>
                        <span className="muted">/USDT</span>
                        <span className="chip-mini">Perp</span>
                      </span>
                    </td>
                    <td><b>{fmt(r.price, cfg.dp)}</b></td>
                    <td><span className={`pill ${cls(r.change)}`}>{fmtPct(r.change)}</span></td>
                    <td>{fmt(r.high, cfg.dp)}</td>
                    <td>{fmt(r.low, cfg.dp)}</td>
                    <td>${fmtShort(r.volume)}</td>
                    <td><Sparkline sym={r.sym} width={110} height={32} /></td>
                    <td>
                      <Link to={`/trade/${r.sym}`} className="btn ghost sm" onClick={(e) => e.stopPropagation()}>Trade</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Fear &amp; Greed Index · last 30 days</div>
          {hist.length ? (
            <div className="fng-wrap">
              <FearGreedGauge value={hist[0].value} label={hist[0].label} size={190} />
              <div className="fng-bars">
                {[...hist].reverse().map((d) => (
                  <div
                    key={d.time}
                    className="fng-bar"
                    title={`${new Date(d.time).toLocaleDateString('en-GB')}: ${d.value} (${d.label})`}
                    style={{ height: `${Math.max(4, d.value)}%`, background: d.value < 25 ? '#ea3943' : d.value < 45 ? '#f0846b' : d.value < 56 ? '#f0b90b' : d.value < 75 ? '#93d16a' : '#16c784' }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="muted">Loading…</div>
          )}
          <p className="muted small-text">0 = extreme fear, 100 = extreme greed. Source: alternative.me</p>
        </div>
        <div className="card">
          <div className="card-title">How to read this page</div>
          <ul className="plain-list">
            <li>Prices and 24h stats come from the WDex exchange and follow the live market.</li>
            <li>Click a column header to sort; click a row to open the trading screen.</li>
            <li>Use ☆ to build a favourites list. It is saved in your browser.</li>
            <li>Global market cap and dominance come from CoinGecko and refresh every 2 minutes.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
